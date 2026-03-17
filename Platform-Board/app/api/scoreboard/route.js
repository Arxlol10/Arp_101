import { NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/db';

export async function GET() {
  try {
    await initializeDatabase();
    
    // 1. Get all teams
    const { rows: teams } = await sql`
      SELECT id, name, score FROM teams ORDER BY score DESC, id ASC
    `;

    // 2. Get categories and challenges summary
    const { rows: challenges } = await sql`
      SELECT id, category FROM challenges WHERE is_honeypot = FALSE
    `;
    const categoryMap = {};
    for (const ch of challenges) {
      if (!categoryMap[ch.category]) categoryMap[ch.category] = { total: 0, challengeIds: new Set() };
      categoryMap[ch.category].total++;
      categoryMap[ch.category].challengeIds.add(ch.id);
    }
    const categories = Object.keys(categoryMap);

    // 3. Get all correct submissions to compute category solves and timeline data
    const { rows: submissions } = await sql`
      SELECT team_id, challenge_id, points_awarded, submitted_at
      FROM submissions
      WHERE is_correct = TRUE
      ORDER BY submitted_at ASC
    `;

    // Process submissions line-chart data (Top 5 teams only)
    const top5Ids = new Set(teams.slice(0, 5).map(t => t.id));
    const timelineData = {}; // { teamId: [{ time, score }] }
    for (const tid of top5Ids) timelineData[tid] = [{ time: 0, score: 0 }];

    // Process table data: per-category solves
    const tableData = {}; // { teamId: { category: count } }
    for (const t of teams) {
      tableData[t.id] = { id: t.id, name: t.name, score: t.score };
      for (const cat of categories) tableData[t.id][cat] = 0;
    }

    // Accumulate points and solve counts
    const tempScores = {};
    for (const tid of top5Ids) tempScores[tid] = 0;

    // Start time baseline (first solve time, or now if none)
    const startTime = submissions.length > 0 ? new Date(submissions[0].submitted_at).getTime() : Date.now();

    for (const sub of submissions) {
      const { team_id, challenge_id, points_awarded, submitted_at } = sub;
      
      // Update table data Category Solves
      for (const cat of categories) {
        if (categoryMap[cat].challengeIds.has(challenge_id)) {
          if (tableData[team_id]) tableData[team_id][cat]++;
          break;
        }
      }

      // Update Top 5 timeline
      if (top5Ids.has(team_id)) {
        tempScores[team_id] += points_awarded;
        timelineData[team_id].push({
          time: new Date(submitted_at).getTime() - startTime,
          score: tempScores[team_id]
        });
      }
    }

    return NextResponse.json({
      categories: categories.map(cat => ({ name: cat, total: categoryMap[cat].total })),
      teams: Object.values(tableData).sort((a, b) => b.score - a.score),
      timeline: timelineData,
    });

  } catch (err) {
    console.error('Scoreboard API err:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
