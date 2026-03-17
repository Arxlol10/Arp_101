import { sql, initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

// ── In-memory rate limiter ──
const rateMap = new Map();
const RATE_LIMIT = 5;       // max submissions
const RATE_WINDOW = 60000;  // per 60 seconds

function checkRateLimit(teamId) {
  const now = Date.now();
  const entry = rateMap.get(teamId);
  if (!entry || now > entry.resetAt) {
    rateMap.set(teamId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) return false;
  return true;
}

export async function POST(request) {
  try {
    await initializeDatabase();

    // 1. Session auth
    const team = await getSession(request);
    if (!team) {
      return NextResponse.json({ error: 'You must be logged in to submit flags.' }, { status: 401 });
    }

    // Rate limit
    if (!checkRateLimit(team.id)) {
      return NextResponse.json({ error: 'Too many submissions. Wait a minute.' }, { status: 429 });
    }

    const { flag } = await request.json();
    if (!flag || !flag.trim()) {
      return NextResponse.json({ error: 'Flag is required.' }, { status: 400 });
    }

    // 2. Look up challenge by flag
    const { rows: challRows } = await sql`
      SELECT id, name, flag, points, is_honeypot, tier
      FROM challenges WHERE flag = ${flag.trim()}
    `;

    if (challRows.length === 0) {
      return NextResponse.json({ error: 'Invalid flag. No points awarded.' }, { status: 400 });
    }

    const challenge = challRows[0];

    // 3. Honeypot?
    if (challenge.is_honeypot) {
      const penalty = -50;
      await sql`
        INSERT INTO submissions (team_id, challenge_id, submitted_flag, is_correct, points_awarded)
        VALUES (${team.id}, ${challenge.id}, ${flag.trim()}, FALSE, ${penalty})
      `;
      await sql`UPDATE teams SET score = score + ${penalty} WHERE id = ${team.id}`;

      return NextResponse.json({
        message: `🍯 HONEYPOT! You fell for "${challenge.name}". ${penalty} points.`,
        pointsAwarded: penalty,
        honeypot: true,
      }, { status: 200 });
    }

    // 4. Already solved?
    const { rows: dupRows } = await sql`
      SELECT id FROM submissions
      WHERE team_id = ${team.id} AND challenge_id = ${challenge.id} AND is_correct = TRUE
    `;
    if (dupRows.length > 0) {
      return NextResponse.json({ error: 'You already solved this challenge.' }, { status: 409 });
    }

    // 5. Calculate points
    const base = challenge.points;

    // First blood check
    const { rows: solveCountRows } = await sql`
      SELECT COUNT(*) as cnt FROM submissions
      WHERE challenge_id = ${challenge.id} AND is_correct = TRUE
    `;
    const existingSolves = Number(solveCountRows[0].cnt);
    const firstBloodBonus = existingSolves === 0 ? Math.floor(base * 0.10) : 0;

    // Hint deductions
    const { rows: hintRows } = await sql`
      SELECT COALESCE(SUM(points_lost), 0) as total_lost
      FROM hint_unlocks
      WHERE team_id = ${team.id}
        AND hint_id IN (SELECT id FROM hints WHERE challenge_id = ${challenge.id})
    `;
    const hintPenalty = Number(hintRows[0].total_lost);

    const total = base + firstBloodBonus - hintPenalty;

    // 6. Record submission
    await sql`
      INSERT INTO submissions (team_id, challenge_id, submitted_flag, is_correct, points_awarded)
      VALUES (${team.id}, ${challenge.id}, ${flag.trim()}, TRUE, ${total})
    `;

    // 7. Update team score
    await sql`UPDATE teams SET score = score + ${total} WHERE id = ${team.id}`;

    // 8. Build response
    let tierUnlocked = null;
    let bonusAwarded = 0;

    // 9. Tier completion check
    const tier = challenge.tier ?? 0;

    const { rows: totalInTierRows } = await sql`
      SELECT COUNT(*) as cnt FROM challenges WHERE tier = ${tier} AND is_honeypot = FALSE
    `;
    const totalInTier = Number(totalInTierRows[0].cnt);

    const { rows: solvedInTierRows } = await sql`
      SELECT COUNT(*) as cnt FROM submissions s
      JOIN challenges c ON c.id = s.challenge_id
      WHERE s.team_id = ${team.id} AND s.is_correct = TRUE AND c.tier = ${tier}
    `;
    const solvedInTier = Number(solvedInTierRows[0].cnt);

    const { rows: alreadyUnlocked } = await sql`
      SELECT id FROM tier_unlocks WHERE team_id = ${team.id} AND tier = ${tier}
    `;

    if (totalInTier > 0 && solvedInTier >= totalInTier && alreadyUnlocked.length === 0) {
      bonusAwarded = 200;
      try {
        await sql`
          INSERT INTO tier_unlocks (team_id, tier, bonus_awarded)
          VALUES (${team.id}, ${tier}, ${bonusAwarded})
        `;
        await sql`UPDATE teams SET score = score + ${bonusAwarded} WHERE id = ${team.id}`;
        tierUnlocked = tier;
      } catch (e) {
        // Unique constraint — already awarded, ignore
      }
    }

    let message = `✅ Correct! "${challenge.name}" solved. +${total} points!`;
    if (firstBloodBonus > 0) {
      message += ` 🩸 First Blood! +${firstBloodBonus} bonus!`;
    }
    if (hintPenalty > 0) {
      message += ` (${hintPenalty} pts deducted for hints)`;
    }
    if (tierUnlocked !== null) {
      message += ` 🎉 Tier ${tierUnlocked} completed! +${bonusAwarded} bonus!`;
    }

    return NextResponse.json({
      message,
      pointsAwarded: total,
      firstBlood: firstBloodBonus > 0,
      firstBloodBonus,
      hintPenalty,
      tierUnlocked,
      bonusAwarded,
    }, { status: 200 });

  } catch (err) {
    console.error('Submit error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
