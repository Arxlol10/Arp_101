import { sql } from '@vercel/postgres';

const CHALLENGES = [
  { name: 'T0-Crypto-01: Multi-Layer Decrypt',      description: 'Wrapped in layers, like an onion so tight. Peel back the encodings to reveal the light.' },
  { name: 'T0-Web-01: Polyglot Upload Bypass',      description: 'I pretend to be picture, yet I hold a dark script; trick the strict bouncer, or remain in the crypt.' },
  { name: 'T0-Web-02: ImageTragick RCE',            description: 'A tragic flaw in how I view art, craft the right magic to tear me apart.' },
  { name: 'T0-Web-03: JWT Secret Leak',             description: 'My signature is forged, but the secret is known. Find what was leaked to claim the throne.' },
  { name: 'T0-Web-SIEM: LFI Logs Exposed',          description: 'I guard the logs where secrets reside, find the local path where I cannot hide.' },
  { name: 'T1-Stego-01: LSB Pixel Hunter',   description: 'Hidden in plain sight, where colors slightly shift. Seek the lowest bits if you want to catch my drift.' },
  { name: 'T1-Stego-02: DTMF Audio Decode',  description: 'I speak in dual tones, a language of the keys. Decode my melody to uncover the mysteries.' },
  { name: 'T1-Forensics-01: Memory Dump',    description: 'Frozen in time, my thoughts lay bare. Sift through the dump to find what shouldn\'t be there.' },
  { name: 'T1-Forensics-02: Deleted Files',  description: 'Erased from the index, but not from the disk. Carve out my remains if you\'re willing to risk.' },
  { name: 'T1-Crypto-04: XOR Key',           description: 'A repeating dance, a simple bite-sized chore. Guess my twisted partner to even the score.' },
  { name: 'T1-Crypto-05: Vigenère Cipher',   description: 'A grid of letters, a repeating guide. Unravel my vintage cipher where secrets hide.' },
  { name: 'T1-Misc-01: Cron Scheduler',      description: 'I wake up on a schedule to run my silent task. What lurks in the background? You need only ask.' },
  { name: 'T1-Misc-02: EXIF Metadata',       description: 'A picture paints a thousand words, but invisible details tell the truth. Look beyond the pixels, sleuth.' },
  { name: 'T1-PrivEsc-01: SUID Find',        description: 'With the power of root, any mortal command can turn to gold. Seek the misconfigured binary, bold.' },
  { name: 'T2-Binary-01: CAP DAC Read',       description: 'Capabilities hold the keys to the kingdom. Bypass the restrictions and read what is hidden.' },
  { name: 'T2-SSHKeyHunt: Key Assembly',       description: 'Shattered into fragments, scattered in the breeze. Reassemble my pieces to unlock the doors with ease.' },
  { name: 'T2-Reverse-01: Binary Validator',   description: 'I speak in assembly, validating your move. Reverse my logic, find what I approve.' },
  { name: 'T2-Forensics-03: MySQL Dump',       description: 'A broken database, a shattered scheme. Fix the corrupted tables to fulfill the dream.' },
  { name: 'T2-Forensics-04: Journal Parse',    description: 'Within the systemd logs, a silent trace is kept. Extract the hidden payload where the secrets slept.' },
  { name: 'T2-Forensics-05: Kernel Frag',      description: 'A kernel panic scattered the truth in its wake. Piece the fragments together, for the answers at stake.' },
  { name: 'T2-Crypto-06: Bash AES Decrypt',    description: 'A command line secret, encrypted and tucked away. Find the AES key scattered in the fray.' },
  { name: 'T3-PrivEsc-03: Kernel Module',       description: 'Deep in the ring 0, a flawed module rests. Exploit its weakness to pass the final tests.' },
  { name: 'T3-Network-01: Port Knocking',       description: 'Knock, knock, knocking on a closed port door. Find the right rhythm and the service you shall explore.' },
  { name: 'T3-Binary-02: Format String',        description: 'A loose percentage sign, a memory leak unsealed. Redirect the flow and the truth will be revealed.' },
  { name: 'T3-Binary-03: Heap Tcache Poison',   description: 'Cache poisoned, memory twisted and frail. Manipulate the heap to tell your own tale.' },
  { name: 'T3-Misc-05: Log Anomaly Analysis',   description: 'A needle in a haystack of access lines. Find the odd one out among the designs.' },
  { name: 'T4-Root-01: Block Cipher Decrypt',    description: 'Blocks chained together, secrets tightly bound. Use the gathered fragments where the final truth is found.' },
  { name: 'T4-Root-02: Master Flag Assembly',     description: 'You reached the core, the ultimate quest. Assemble the pieces and pass the grand test.' },
];

async function updateDescriptions() {
  console.log('Starting DB update...');
  let updated = 0;
  for (const ch of CHALLENGES) {
    try {
      await sql`UPDATE challenges SET description = ${ch.description} WHERE name = ${ch.name}`;
      updated++;
      console.log(`Updated: ${ch.name}`);
    } catch (err) {
      console.error(`Failed to update ${ch.name}:`, err.message);
    }
  }
  console.log(`Update complete. ${updated} records updated.`);
  process.exit(0);
}

updateDescriptions();
