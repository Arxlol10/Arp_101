import { NextResponse } from 'next/server';
import { sql, initializeDatabase } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(request) {
  try {
    await initializeDatabase();

    const team = await getSession(request);
    if (!team) {
      return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
    }

    // Get all non-honeypot challenges (never expose flag values)
    const { rows: challenges } = await sql`
      SELECT id, name, category, points, tier
      FROM challenges
      WHERE is_honeypot = FALSE
      ORDER BY tier ASC, points ASC, name ASC
    `;

    // Get solve counts per challenge
    const { rows: solveCounts } = await sql`
      SELECT challenge_id, COUNT(*) as solve_count
      FROM submissions
      WHERE is_correct = TRUE
      GROUP BY challenge_id
    `;
    const solveMap = {};
    for (const s of solveCounts) {
      solveMap[s.challenge_id] = Number(s.solve_count);
    }

    // Get first blood per challenge
    const { rows: firstBloods } = await sql`
      SELECT DISTINCT ON (challenge_id) challenge_id, team_id
      FROM submissions
      WHERE is_correct = TRUE
      ORDER BY challenge_id, submitted_at ASC
    `;
    const firstBloodMap = {};
    for (const fb of firstBloods) {
      firstBloodMap[fb.challenge_id] = fb.team_id;
    }

    // Get this team's correct solves
    const { rows: teamSolves } = await sql`
      SELECT challenge_id FROM submissions
      WHERE team_id = ${team.id} AND is_correct = TRUE
    `;
    const solvedSet = new Set(teamSolves.map(s => s.challenge_id));

    // Get this team's tier unlocks
    const { rows: tierUnlocks } = await sql`
      SELECT tier, bonus_awarded FROM tier_unlocks
      WHERE team_id = ${team.id}
    `;
    const tierUnlockMap = {};
    for (const tu of tierUnlocks) {
      tierUnlockMap[tu.tier] = Number(tu.bonus_awarded);
    }

    // Get hints for each challenge (without content — just id and penalty)
    const { rows: hints } = await sql`
      SELECT h.id, h.challenge_id, h.penalty_pct
      FROM hints h
      JOIN challenges c ON c.id = h.challenge_id
      WHERE c.is_honeypot = FALSE
    `;

    // Get this team's unlocked hints
    const { rows: unlockedHints } = await sql`
      SELECT hint_id FROM hint_unlocks WHERE team_id = ${team.id}
    `;
    const unlockedHintSet = new Set(unlockedHints.map(h => h.hint_id));

    // Build hint map per challenge
    const hintMap = {};
    for (const h of hints) {
      if (!hintMap[h.challenge_id]) hintMap[h.challenge_id] = [];
      hintMap[h.challenge_id].push({
        id: h.id,
        penaltyPct: h.penalty_pct,
        unlocked: unlockedHintSet.has(h.id),
      });
    }

    // Group by tier
    const tiers = {};
    for (const ch of challenges) {
      const t = ch.tier ?? 0;
      if (!tiers[t]) tiers[t] = { tier: t, challenges: [], tierUnlocked: t in tierUnlockMap, tierBonus: tierUnlockMap[t] || 0 };
      tiers[t].challenges.push({
        id: ch.id,
        name: ch.name,
        category: ch.category,
        points: ch.points,
        tier: t,
        solveCount: solveMap[ch.id] || 0,
        firstBlood: firstBloodMap[ch.id] === team.id,
        solved: solvedSet.has(ch.id),
        hints: hintMap[ch.id] || [],
      });
    }

    // Count total and solved per tier
    for (const t of Object.values(tiers)) {
      t.totalChallenges = t.challenges.length;
      t.solvedCount = t.challenges.filter(c => c.solved).length;
    }

    return NextResponse.json({
      teamId: team.id,
      teamName: team.name,
      tiers: Object.values(tiers).sort((a, b) => a.tier - b.tier),
    });
  } catch (err) {
    console.error('Challenges API error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
