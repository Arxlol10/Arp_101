import { sql, initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

// All challenges organized by tier — flag values from env vars
const CHALLENGES = [
  // ═══ TIER 0 — Legitimate ═══
  { name: 'T0-Crypto-01: Multi-Layer Decrypt',      category: 'Crypto',     flag: process.env.T0_CRYPTO_01,     points: 100, tier: 0, is_honeypot: false, difficulty: 'EASY', description: 'Wrapped in layers, like an onion so tight. Peel back the encodings to reveal the light.' },
  { name: 'T0-Web-01: Polyglot Upload Bypass',      category: 'Web',        flag: process.env.T0_WEB_01,        points: 100, tier: 0, is_honeypot: false, difficulty: 'MEDIUM', description: 'I pretend to be picture, yet I hold a dark script; trick the strict bouncer, or remain in the crypt.' },
  { name: 'T0-Web-02: ImageTragick RCE',            category: 'Web',        flag: process.env.T0_WEB_02,        points: 100, tier: 0, is_honeypot: false, difficulty: 'EASY', description: 'A tragic flaw in how I view art, craft the right magic to tear me apart.' },
  { name: 'T0-Web-03: JWT Secret Leak',             category: 'Web',        flag: process.env.T0_WEB_03,        points: 100, tier: 0, is_honeypot: false, difficulty: 'EASY', description: 'My signature is forged, but the secret is known. Find what was leaked to claim the throne.' },
  { name: 'T0-Web-SIEM: LFI Logs Exposed',          category: 'Web',        flag: process.env.T0_WEB_SIEM,      points: 150, tier: 0, is_honeypot: false, difficulty: 'MEDIUM', description: 'I guard the logs where secrets reside, find the local path where I cannot hide.' },

  // ═══ TIER 0 — Honeypots ═══
  { name: 'T0-HP: Robots.txt Trap',       category: 'Honeypot', flag: process.env.T0_HP_ROBOTS,      points: 50, tier: 0, is_honeypot: true, difficulty: 'EASY', description: '' },
  { name: 'T0-HP: Dotenv Exposed',        category: 'Honeypot', flag: process.env.T0_HP_DOTENV,      points: 50, tier: 0, is_honeypot: true, difficulty: 'EASY', description: '' },
  { name: 'T0-HP: SQL Dump Fake',         category: 'Honeypot', flag: process.env.T0_HP_SQL_DUMP,    points: 50, tier: 0, is_honeypot: true, difficulty: 'EASY', description: '' },
  { name: 'T0-HP: Admin Notes Decoy',     category: 'Honeypot', flag: process.env.T0_HP_ADMIN_NOTES, points: 50, tier: 0, is_honeypot: true, difficulty: 'EASY', description: '' },
  { name: 'T0-HP: Config Backup Trap',    category: 'Honeypot', flag: process.env.T0_HP_CONFIG_BAK,  points: 50, tier: 0, is_honeypot: true, difficulty: 'EASY', description: '' },
  { name: 'T0-HP: Crypto-02 ROT13 Trap',  category: 'Honeypot', flag: process.env.T0_HP_CRYPTO02,    points: 50, tier: 0, is_honeypot: true, difficulty: 'EASY', description: '' },
  { name: 'T0-HP: Crypto-03 MD5 Trap',    category: 'Honeypot', flag: process.env.T0_HP_CRYPTO03,    points: 50, tier: 0, is_honeypot: true, difficulty: 'EASY', description: '' },

  // ═══ TIER 1 — Legitimate ═══
  { name: 'T1-Stego-01: LSB Pixel Hunter',   category: 'Steganography', flag: process.env.T1_STEGO_01,      points: 150, tier: 1, is_honeypot: false, difficulty: 'MEDIUM', description: 'Hidden in plain sight, where colors slightly shift. Seek the lowest bits if you want to catch my drift.' },
  { name: 'T1-Stego-02: DTMF Audio Decode',  category: 'Steganography', flag: process.env.T1_STEGO_02,      points: 150, tier: 1, is_honeypot: false, difficulty: 'EASY', description: 'I speak in dual tones, a language of the keys. Decode my melody to uncover the mysteries.' },
  { name: 'T1-Forensics-01: Memory Dump',    category: 'Forensics',     flag: process.env.T1_FORENSICS_01,  points: 150, tier: 1, is_honeypot: false, difficulty: 'HARD', description: 'Frozen in time, my thoughts lay bare. Sift through the dump to find what shouldn\'t be there.' },
  { name: 'T1-Forensics-02: Deleted Files',  category: 'Forensics',     flag: process.env.T1_FORENSICS_02,  points: 150, tier: 1, is_honeypot: false, difficulty: 'MEDIUM', description: 'Erased from the index, but not from the disk. Carve out my remains if you\'re willing to risk.' },
  { name: 'T1-Crypto-04: XOR Key',           category: 'Crypto',        flag: process.env.T1_CRYPTO_04,     points: 150, tier: 1, is_honeypot: false, difficulty: 'EASY', description: 'A repeating dance, a simple bite-sized chore. Guess my twisted partner to even the score.' },
  { name: 'T1-Crypto-05: Vigenère Cipher',   category: 'Crypto',        flag: process.env.T1_CRYPTO_05,     points: 150, tier: 1, is_honeypot: false, difficulty: 'EASY', description: 'A grid of letters, a repeating guide. Unravel my vintage cipher where secrets hide.' },
  { name: 'T1-Misc-01: Cron Scheduler',      category: 'Misc',          flag: process.env.T1_MISC_01,       points: 150, tier: 1, is_honeypot: false, difficulty: 'EASY', description: 'I wake up on a schedule to run my silent task. What lurks in the background? You need only ask.' },
  { name: 'T1-Misc-02: EXIF Metadata',       category: 'Misc',          flag: process.env.T1_MISC_02,       points: 150, tier: 1, is_honeypot: false, difficulty: 'EASY', description: 'A picture paints a thousand words, but invisible details tell the truth. Look beyond the pixels, sleuth.' },
  { name: 'T1-PrivEsc-01: SUID Find',        category: 'PrivEsc',       flag: process.env.T1_PRIVESC_01,    points: 200, tier: 1, is_honeypot: false, difficulty: 'MEDIUM', description: 'With the power of root, any mortal command can turn to gold. Seek the misconfigured binary, bold.' },

  // ═══ TIER 1 — Honeypots ═══
  { name: 'T1-HP: Sudo Trap',            category: 'Honeypot', flag: process.env.T1_HP_PRIVESC02,    points: 50, tier: 1, is_honeypot: true },
  { name: 'T1-HP: RSA Small-e Gotcha',   category: 'Honeypot', flag: process.env.T1_HP_CRYPTO_HP01,  points: 50, tier: 1, is_honeypot: true },
  { name: 'T1-HP: Backup Found',         category: 'Honeypot', flag: process.env.T1_HP_BACKUP,       points: 50, tier: 1, is_honeypot: true },
  { name: 'T1-HP: Credentials',          category: 'Honeypot', flag: process.env.T1_HP_CREDENTIALS,  points: 50, tier: 1, is_honeypot: true },
  { name: 'T1-HP: PEM Key',              category: 'Honeypot', flag: process.env.T1_HP_PEM,          points: 50, tier: 1, is_honeypot: true },
  { name: 'T1-HP: Log Grep Trap',        category: 'Honeypot', flag: process.env.T1_HP_MISC03,       points: 50, tier: 1, is_honeypot: true },

  // ═══ TIER 2 — Legitimate ═══
  { name: 'T2-Binary-01: CAP DAC Read',       category: 'Binary',    flag: process.env.T2_BINARY_01,     points: 200, tier: 2, is_honeypot: false, difficulty: 'HARD', description: 'Capabilities hold the keys to the kingdom. Bypass the restrictions and read what is hidden.' },
  { name: 'T2-SSHKeyHunt: Key Assembly',       category: 'Misc',      flag: process.env.T2_SSHKEYHUNT,    points: 200, tier: 2, is_honeypot: false, difficulty: 'MEDIUM', description: 'Shattered into fragments, scattered in the breeze. Reassemble my pieces to unlock the doors with ease.' },
  { name: 'T2-Reverse-01: Binary Validator',   category: 'Reverse',   flag: process.env.T2_REVERSE_01,    points: 200, tier: 2, is_honeypot: false, difficulty: 'HARD', description: 'I speak in assembly, validating your move. Reverse my logic, find what I approve.' },
  { name: 'T2-Forensics-03: MySQL Dump',       category: 'Forensics', flag: process.env.T2_FORENSICS_03,  points: 200, tier: 2, is_honeypot: false, difficulty: 'MEDIUM', description: 'A broken database, a shattered scheme. Fix the corrupted tables to fulfill the dream.' },
  { name: 'T2-Forensics-04: Journal Parse',    category: 'Forensics', flag: process.env.T2_FORENSICS_04,  points: 200, tier: 2, is_honeypot: false, difficulty: 'MEDIUM', description: 'Within the systemd logs, a silent trace is kept. Extract the hidden payload where the secrets slept.' },
  { name: 'T2-Forensics-05: Kernel Frag',      category: 'Forensics', flag: process.env.T2_FORENSICS_05,  points: 200, tier: 2, is_honeypot: false, difficulty: 'HARD', description: 'A kernel panic scattered the truth in its wake. Piece the fragments together, for the answers at stake.' },
  { name: 'T2-Crypto-06: Bash AES Decrypt',    category: 'Crypto',    flag: process.env.T2_CRYPTO_06,     points: 250, tier: 2, is_honeypot: false, difficulty: 'HARD', description: 'A command line secret, encrypted and tucked away. Find the AES key scattered in the fray.' },

  // ═══ TIER 2 — Honeypots ═══
  { name: 'T2-HP: Engineer Password',    category: 'Honeypot', flag: process.env.T2_HP_ENG_PASS,     points: 50, tier: 2, is_honeypot: true },
  { name: 'T2-HP: Secret Key',           category: 'Honeypot', flag: process.env.T2_HP_SECRET_KEY,   points: 50, tier: 2, is_honeypot: true },
  { name: 'T2-HP: Database Backup',      category: 'Honeypot', flag: process.env.T2_HP_DB_BACKUP,    points: 50, tier: 2, is_honeypot: true },
  { name: 'T2-HP: SSH Key',              category: 'Honeypot', flag: process.env.T2_HP_SSH_KEY,       points: 50, tier: 2, is_honeypot: true },
  { name: 'T2-HP: Config Decoy',         category: 'Honeypot', flag: process.env.T2_HP_CONFIG,       points: 50, tier: 2, is_honeypot: true },
  { name: 'T2-HP: Bash History',         category: 'Honeypot', flag: process.env.T2_HP_BASH_HIST,    points: 50, tier: 2, is_honeypot: true },
  { name: 'T2-HP: Escalation Notes',     category: 'Honeypot', flag: process.env.T2_HP_ESC_NOTES,    points: 50, tier: 2, is_honeypot: true },

  // ═══ TIER 3 — Legitimate ═══
  { name: 'T3-PrivEsc-03: Kernel Module',       category: 'PrivEsc',  flag: process.env.T3_PRIVESC_03,   points: 300, tier: 3, is_honeypot: false, difficulty: 'HARD', description: 'Deep in the ring 0, a flawed module rests. Exploit its weakness to pass the final tests.' },
  { name: 'T3-Network-01: Port Knocking',       category: 'Network',  flag: process.env.T3_NETWORK_01,   points: 300, tier: 3, is_honeypot: false, difficulty: 'MEDIUM', description: 'Knock, knock, knocking on a closed port door. Find the right rhythm and the service you shall explore.' },
  { name: 'T3-Binary-02: Format String',        category: 'Binary',   flag: process.env.T3_BINARY_02,    points: 300, tier: 3, is_honeypot: false, difficulty: 'HARD', description: 'A loose percentage sign, a memory leak unsealed. Redirect the flow and the truth will be revealed.' },
  { name: 'T3-Binary-03: Heap Tcache Poison',   category: 'Binary',   flag: process.env.T3_BINARY_03,    points: 350, tier: 3, is_honeypot: false, difficulty: 'HARD', description: 'Cache poisoned, memory twisted and frail. Manipulate the heap to tell your own tale.' },
  { name: 'T3-misc-04: Log Anomaly Analysis',   category: 'Misc',     flag: process.env.T3_MISC_04,      points: 250, tier: 3, is_honeypot: false, difficulty: 'MEDIUM', description: 'A needle in a haystack of access lines. Find the odd one out among the designs.' },

  // ═══ TIER 3 — Honeypots ═══
  { name: 'T3-HP: Bash History',          category: 'Honeypot', flag: process.env.T3_HP_BASH_HIST,    points: 50, tier: 3, is_honeypot: true },
  { name: 'T3-HP: Sudoers Backup',        category: 'Honeypot', flag: process.env.T3_HP_SUDOERS,      points: 50, tier: 3, is_honeypot: true },
  { name: 'T3-HP: Fake Public Key',       category: 'Honeypot', flag: process.env.T3_HP_ID_RSA,       points: 50, tier: 3, is_honeypot: true },
  { name: 'T3-HP: Docker Compose',        category: 'Honeypot', flag: process.env.T3_HP_DOCKER,       points: 50, tier: 3, is_honeypot: true },
  { name: 'T3-HP: Password DB',           category: 'Honeypot', flag: process.env.T3_HP_PASSWORDS,    points: 50, tier: 3, is_honeypot: true },
  { name: 'T3-HP: SSH Key Hidden',        category: 'Honeypot', flag: process.env.T3_HP_SSH_KEY,      points: 50, tier: 3, is_honeypot: true },
  { name: 'T3-HP: Auth Logs Grep',        category: 'Honeypot', flag: process.env.T3_HP_LOGS,         points: 50, tier: 3, is_honeypot: true },
  { name: 'T3-HP: Database Dump',         category: 'Honeypot', flag: process.env.T3_HP_DB_DUMP,      points: 50, tier: 3, is_honeypot: true },
  { name: 'T3-HP: ZIP Crack',             category: 'Honeypot', flag: process.env.T3_HP_ZIP_CRACK,    points: 50, tier: 3, is_honeypot: true },
  { name: 'T3-HP: Hidden Notes',          category: 'Honeypot', flag: process.env.T3_HP_HIDDEN_TXT,   points: 50, tier: 3, is_honeypot: true },

  // ═══ TIER 4 — Legitimate ═══
  { name: 'T4-Root-01: Block Cipher Decrypt',    category: 'Root', flag: process.env.T4_ROOT_01,      points: 500, tier: 4, is_honeypot: false, difficulty: 'HARD', description: 'Blocks chained together, secrets tightly bound. Use the gathered fragments where the final truth is found.' },
  { name: 'T4-Root-02: Master Flag Assembly',     category: 'Root', flag: process.env.T4_MASTER,       points: 1000, tier: 4, is_honeypot: false, difficulty: 'HARD', description: 'You reached the core, the ultimate quest. Assemble the pieces and pass the grand test.' },

  // ═══ TIER 4 — Honeypots ═══
  { name: 'T4-HP: Fake root.txt',         category: 'Honeypot', flag: process.env.T4_HP_ROOT_TXT,     points: 50, tier: 4, is_honeypot: true },
  { name: 'T4-HP: Shadow Fake Hash',      category: 'Honeypot', flag: process.env.T4_HP_SHADOW,       points: 50, tier: 4, is_honeypot: true },
  { name: 'T4-HP: SSH Keys ZIP',          category: 'Honeypot', flag: process.env.T4_HP_SSH_ZIP,      points: 50, tier: 4, is_honeypot: true },
  { name: 'T4-HP: Bash History Curl',     category: 'Honeypot', flag: process.env.T4_HP_BASH_HIST,    points: 50, tier: 4, is_honeypot: true },
];

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key');
  return key && key === process.env.ADMIN_KEY;
}

export async function POST(request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeDatabase();

    let inserted = 0;
    let skipped = 0;

    for (const ch of CHALLENGES) {
      if (!ch.flag) { skipped++; continue; }

      const { rows: existing } = await sql`SELECT id FROM challenges WHERE flag = ${ch.flag}`;
      if (existing.length > 0) { 
        await sql`UPDATE challenges SET description = ${ch.description || ''} WHERE flag = ${ch.flag}`;
        skipped++; 
        continue; 
      }

      await sql`
        INSERT INTO challenges (
          name, category, flag, points, tier, is_honeypot,
          difficulty, description
        )
        VALUES (
          ${ch.name}, ${ch.category}, ${ch.flag}, ${ch.points}, ${ch.tier}, ${ch.is_honeypot},
          ${ch.difficulty || 'MEDIUM'}, ${ch.description || ''}
        )
      `;
      inserted++;
    }

    return NextResponse.json({
      message: `Seeding complete: ${inserted} inserted, ${skipped} skipped.`,
      total: CHALLENGES.length,
      inserted,
      skipped,
    });
  } catch (err) {
    console.error('Seed error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

