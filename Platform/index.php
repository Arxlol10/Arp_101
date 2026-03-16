<?php
// ── NexusCorp CTF Flag Gate ───────────────────────────────────────────────
// T0 → T1: submit WEB-03 flag
// T1 → T2: submit ALL 7 T1 flags
// Session cookie only — no registration needed.

session_start();

// ── T0: Only WEB-03 unlocks T1 ───────────────────────────────────────────
define('T0_UNLOCK_FLAG', 'FLAG{web_03_jwt_secret_leak_q2w8}');

// ── T1: ALL of these must be submitted to unlock T2 ──────────────────────
$T1_FLAGS = [
    'FLAG{t1_st3g0_lsb_r3d_ch4nn3l_x9p2}',
    'FLAG{t1_w4v_sp3ctr0gr4m_m0rs3_k2n7}',
    'FLAG{t1_m3m_dump_str1ngs_4n4lys1s_w3r}',
    'FLAG{t1_d1sk_c4rv3_d3l3t3d_r3c0v3r_p5q}',
    'FLAG{t1_x0r_k3y_r3p34t_br0k3n_m9x3}',
    'FLAG{t1_v1g3n3r3_k3y_1n_c1ph3r_y7w2}',
    'FLAG{t1_su1d_find_privesc_9z2}',
];

// ── Honeypots ─────────────────────────────────────────────────────────────
$HONEYPOTS = [
    'FLAG{t1_sudo_trap_gotcha}',
    'FLAG{crypto_fake_rsa_small_e_h4x0r}',
    'FLAG{t1_fake_creds_trap_7x2k}',
    'FLAG{t3_fake_kernel_exploit_n0p3}',
];

// ── Session state ─────────────────────────────────────────────────────────
if (!isset($_SESSION['t1_submitted'])) $_SESSION['t1_submitted'] = [];
$t1_unlocked = !empty($_SESSION['t1_unlocked']);
$t2_unlocked = !empty($_SESSION['t2_unlocked']);

$msg      = '';
$msg_type = '';

// ── Handle submission ─────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $flag = trim($_POST['flag'] ?? '');

    if (in_array($flag, $HONEYPOTS, true)) {
        $msg      = '⚠ HONEYPOT DETECTED. That flag is fake. Someone is watching you.';
        $msg_type = 'warn';
        @file_put_contents('/var/log/redteam/honeypot.log',
            date('Y-m-d H:i:s') . ' HONEYPOT: ' . $flag .
            ' from ' . ($_SERVER['REMOTE_ADDR'] ?? '?') . "\n", FILE_APPEND);

    } elseif ($flag === T0_UNLOCK_FLAG && !$t1_unlocked) {
        $_SESSION['t1_unlocked'] = true;
        $t1_unlocked = true;
        $msg      = '✔ WEB-03 flag accepted. TIER 1 files are now unlocked.';
        $msg_type = 'ok';

    } elseif ($flag === T0_UNLOCK_FLAG && $t1_unlocked) {
        $msg      = 'Already unlocked Tier 1.';
        $msg_type = 'warn';

    } elseif (in_array($flag, $T1_FLAGS, true)) {
        if (!$t1_unlocked) {
            $msg      = 'Complete T0 first — submit the WEB-03 flag to unlock Tier 1.';
            $msg_type = 'err';
        } elseif (in_array($flag, $_SESSION['t1_submitted'], true)) {
            $msg      = 'Already submitted that one. Keep going.';
            $msg_type = 'warn';
        } else {
            $_SESSION['t1_submitted'][] = $flag;
            $remaining = count($T1_FLAGS) - count($_SESSION['t1_submitted']);

            // Check if all T1 flags submitted
            if (count($_SESSION['t1_submitted']) >= count($T1_FLAGS)) {
                $_SESSION['t2_unlocked'] = true;
                $t2_unlocked = true;
                $msg      = '✔ All Tier 1 flags submitted. TIER 2 files are now unlocked!';
                $msg_type = 'ok';
            } else {
                $msg      = "✔ T1 flag accepted. {$remaining} more T1 flag(s) needed to unlock Tier 2.";
                $msg_type = 'ok';
            }
        }

    } elseif (!empty($flag)) {
        if (preg_match('/^FLAG\{[^}]+\}$/', $flag)) {
            $msg      = 'Flag format recognised but not accepted here. Check you are submitting the right flag.';
            $msg_type = 'warn';
        } else {
            $msg      = 'Invalid flag format.';
            $msg_type = 'err';
        }
    }
}

$t1_progress  = count($_SESSION['t1_submitted']);
$t1_total     = count($T1_FLAGS);
$t1_pct       = $t1_total ? (int)($t1_progress / $t1_total * 100) : 0;
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>NexusCorp — CTF</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0e14;color:#c5d0e0;font-family:'Courier New',monospace;font-size:14px;padding:32px 20px}
.wrap{max-width:900px;margin:0 auto}
h1{color:#5eb8ff;font-size:18px;letter-spacing:3px;margin-bottom:4px}
.sub{color:#556677;font-size:12px;margin-bottom:32px}
.section{margin-bottom:28px}
.section h2{color:#8899aa;font-size:12px;letter-spacing:2px;text-transform:uppercase;
            border-bottom:1px solid #1e2a38;padding-bottom:6px;margin-bottom:14px;
            display:flex;align-items:center;gap:10px}
.msg{padding:10px 14px;border-radius:3px;margin-bottom:18px;font-size:13px}
.ok  {background:#0d2b1e;border:1px solid #1e6b42;color:#4caf88}
.err {background:#2b0d0d;border:1px solid #6b1e1e;color:#cf6679}
.warn{background:#2b230d;border:1px solid #6b551e;color:#cfaa46}
.submit-row{display:flex;gap:8px;align-items:center}
.submit-row input{flex:1;background:#0d1520;border:1px solid #2e3e52;
                  color:#c5d0e0;padding:9px 12px;border-radius:3px;
                  font-family:inherit;font-size:13px;max-width:480px}
.submit-row input:focus{outline:none;border-color:#5eb8ff}
.btn{padding:9px 18px;border-radius:3px;font-family:inherit;font-size:13px;
     cursor:pointer;border:1px solid #1e6b42;background:#0d2b1e;color:#4caf88}
.btn:hover{background:#0d3b26}
.challenge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.card{background:#0d1520;border:1px solid #1e2a38;border-radius:3px;padding:14px}
.card h3{font-size:13px;color:#cdd8e8;margin-bottom:6px}
.card p{font-size:12px;color:#7a8fa0;line-height:1.5;margin-bottom:10px}
.card a{display:inline-block;padding:5px 12px;border-radius:3px;font-size:12px;
        border:1px solid #1e5090;background:#0d2240;color:#5eb8ff;text-decoration:none}
.card a:hover{background:#0d3260}
.lock-box{background:#1a0d0d;border:1px solid #3d1a1a;border-radius:3px;
          padding:18px;text-align:center;color:#8899aa;font-size:13px}
.lock-box strong{color:#cf6679;display:block;font-size:15px;margin-bottom:6px}
.file-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px}
.file-item{background:#0d1520;border:1px solid #1e6b42;border-radius:3px;
           padding:12px;display:flex;justify-content:space-between;align-items:center}
.file-item span{font-size:12px;color:#8899aa}
.file-item a{padding:4px 10px;border-radius:3px;font-size:12px;border:1px solid #1e6b42;
             background:#0d2b1e;color:#4caf88;text-decoration:none}
.file-item a:hover{background:#0d3b26}
.badge{font-size:11px;padding:2px 8px;border-radius:2px;font-weight:bold}
.badge-ok  {background:#0d2b1e;border:1px solid #1e6b42;color:#4caf88}
.badge-lock{background:#1a0d0d;border:1px solid #3d1a1a;color:#cf6679}
.badge-part{background:#1a1500;border:1px solid #4d3d00;color:#cfaa46}
.progress-wrap{margin:10px 0 14px}
.progress-label{font-size:11px;color:#556677;margin-bottom:4px}
.progress{background:#1e2a38;border-radius:3px;height:6px}
.progress-fill{height:100%;border-radius:3px;background:#4caf88;transition:.4s}
.honeypot-note{font-size:11px;color:#556677;margin-top:10px}
</style>
</head>
<body>
<div class="wrap">

  <h1>[ NexusCorp RedTeam CTF ]</h1>
  <p class="sub">Compromise the infrastructure. Capture the flags.</p>

  <?php if ($msg): ?>
    <div class="msg <?= $msg_type ?>"><?= htmlspecialchars($msg) ?></div>
  <?php endif; ?>

  <!-- ── FLAG SUBMIT ──────────────────────────────────────────────── -->
  <div class="section">
    <h2>Submit Flag</h2>
    <form method="POST" autocomplete="off">
      <div class="submit-row">
        <input type="text" name="flag" placeholder="FLAG{...}" spellcheck="false" autofocus>
        <button class="btn" type="submit">Submit</button>
      </div>
    </form>
    <p class="honeypot-note">⚠ Fake flags are scattered everywhere. Submitting one will be logged.</p>
  </div>

  <!-- ── T0 CHALLENGES ─────────────────────────────────────────────── -->
  <div class="section">
    <h2>
      Tier 0 — External / Pre-Auth
      <?php if ($t1_unlocked): ?>
        <span class="badge badge-ok">CLEARED</span>
      <?php else: ?>
        <span class="badge badge-lock">ACTIVE</span>
      <?php endif; ?>
    </h2>
    <div class="challenge-grid">
      <div class="card">
        <h3>WEB-01: Polyglot Upload</h3>
        <p>A file upload portal that checks extensions. Find the gap. Get a shell.</p>
        <a href="http://<?= htmlspecialchars(explode(':', $_SERVER['HTTP_HOST'])[0]) ?>:8001/" target="_blank">Open Challenge →</a>
      </div>
      <div class="card">
        <h3>WEB-02: ImageTragick RCE</h3>
        <p>A thumbnail generator. Something old lurks in the image processor.</p>
        <a href="http://<?= htmlspecialchars(explode(':', $_SERVER['HTTP_HOST'])[0]) ?>:8002/" target="_blank">Open Challenge →</a>
      </div>
      <div class="card">
        <h3>WEB-03: JWT Secret Leak</h3>
        <p>A corporate login portal. Secrets hide in plain JavaScript.</p>
        <a href="http://<?= htmlspecialchars(explode(':', $_SERVER['HTTP_HOST'])[0]) ?>:8003/" target="_blank">Open Challenge →</a>
      </div>
      <div class="card">
        <h3>SIEM: LFI Log Viewer</h3>
        <p>Internal monitoring panel. The log viewer trusts user input too much.</p>
        <a href="http://<?= htmlspecialchars(explode(':', $_SERVER['HTTP_HOST'])[0]) ?>:8080/" target="_blank">Open Challenge →</a>
      </div>
    </div>
    <?php if (!$t1_unlocked): ?>
      <div class="lock-box" style="margin-top:12px">
        <strong>🔒 T1 LOCKED</strong>
        Complete WEB-03 and submit its flag above to unlock Tier 1 files.
        <br><span style="font-size:11px;margin-top:6px;display:block;color:#445566">Chain: WEB-01 → WEB-02 → WEB-03 → submit flag</span>
      </div>
    <?php endif; ?>
  </div>

  <!-- ── T1 FILES ──────────────────────────────────────────────────── -->
  <div class="section">
    <h2>
      Tier 1 — Files
      <?php if ($t2_unlocked): ?>
        <span class="badge badge-ok">CLEARED</span>
      <?php elseif ($t1_unlocked): ?>
        <span class="badge badge-part"><?= $t1_progress ?>/<?= $t1_total ?> FLAGS</span>
      <?php else: ?>
        <span class="badge badge-lock">LOCKED</span>
      <?php endif; ?>
    </h2>

    <?php if ($t1_unlocked): ?>

      <?php if (!$t2_unlocked): ?>
        <div class="progress-wrap">
          <div class="progress-label">T2 unlock progress: <?= $t1_progress ?>/<?= $t1_total ?> T1 flags submitted</div>
          <div class="progress"><div class="progress-fill" style="width:<?= $t1_pct ?>%"></div></div>
        </div>
      <?php endif; ?>

      <div class="file-grid">
        <?php
        $t1_files = [
          ['STEGO-01: suspicious.png',       'stego/suspicious.png'],
          ['STEGO-01: README',               'stego/stego01_README.txt'],
          ['STEGO-02: transmission.wav',     'stego/transmission.wav'],
          ['STEGO-02: hint.txt',             'stego/stego02_hint.txt'],
          ['FORENSICS-01: memory.dmp',       'forensics/memory.dmp'],
          ['FORENSICS-01: README',           'forensics/forensics01_README.txt'],
          ['FORENSICS-02: disk.img',         'forensics/disk.img'],
          ['FORENSICS-02: README',           'forensics/forensics02_README.txt'],
          ['CRYPTO-04: xor_cipher.bin',      'crypto/xor_cipher.bin'],
          ['CRYPTO-04: note.txt',            'crypto/note.txt'],
          ['CRYPTO-04: README',              'crypto/crypto04_README.txt'],
          ['CRYPTO-05: vigenere.txt',        'crypto/vigenere.txt'],
          ['CRYPTO-05: README',              'crypto/crypto05_README.txt'],
        ];
        foreach ($t1_files as [$label, $path]):
          $full = '/var/www/html/files/' . $path;
        ?>
          <div class="file-item">
            <span><?= htmlspecialchars($label) ?></span>
            <?php if (file_exists($full)): ?>
              <a href="/files/<?= htmlspecialchars($path) ?>">Download</a>
            <?php else: ?>
              <span style="color:#3d4d5d;font-size:11px">pending</span>
            <?php endif; ?>
          </div>
        <?php endforeach; ?>
      </div>

    <?php else: ?>
      <div class="lock-box">
        <strong>🔒 ACCESS DENIED</strong>
        Complete WEB-03 and submit its flag to unlock Tier 1 files.
        <br><span style="font-size:11px;margin-top:6px;display:block;color:#445566">
          Hint: WEB-01 → WEB-02 → WEB-03 → submit here
        </span>
      </div>
    <?php endif; ?>
  </div>

  <!-- ── T2 FILES ──────────────────────────────────────────────────── -->
  <div class="section">
    <h2>
      Tier 2 — Files
      <?php if ($t2_unlocked): ?>
        <span class="badge badge-ok">UNLOCKED</span>
      <?php elseif ($t1_unlocked): ?>
        <span class="badge badge-part">SUBMIT ALL T1 FLAGS TO UNLOCK</span>
      <?php else: ?>
        <span class="badge badge-lock">LOCKED</span>
      <?php endif; ?>
    </h2>

    <?php if ($t2_unlocked): ?>
      <div class="file-grid">
        <?php
        $t2_files = [
          ['CRYPTO-06: encrypted bash history', 'crypto/encrypted_bash_history.enc'],
          ['CRYPTO-06: analyst note',           'crypto/analyst_note.txt'],
          ['FORENSICS-03: analyst_db.sql',      'forensics/analyst_db.sql'],
          ['FORENSICS-05: dmesg.log',           'forensics/dmesg.log'],
          ['REVERSE-01: license_validator.py',  'misc/license_validator.py'],
        ];
        foreach ($t2_files as [$label, $path]):
          $full = '/var/www/html/files/' . $path;
        ?>
          <div class="file-item">
            <span><?= htmlspecialchars($label) ?></span>
            <?php if (file_exists($full)): ?>
              <a href="/files/<?= htmlspecialchars($path) ?>">Download</a>
            <?php else: ?>
              <span style="color:#3d4d5d;font-size:11px">pending</span>
            <?php endif; ?>
          </div>
        <?php endforeach; ?>
      </div>

    <?php else: ?>
      <div class="lock-box">
        <strong>🔒 LOCKED</strong>
        <?php if ($t1_unlocked): ?>
          Submit all <?= $t1_total ?> Tier 1 flags to unlock Tier 2 files.
          <br><span style="font-size:11px;margin-top:6px;display:block;color:#445566">
            <?= $t1_progress ?>/<?= $t1_total ?> submitted so far
          </span>
        <?php else: ?>
          Complete Tier 0 first.
        <?php endif; ?>
      </div>
    <?php endif; ?>
  </div>

</div>
</body>
</html>
