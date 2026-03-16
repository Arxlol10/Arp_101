<?php
// ── CTF Flag Gate ─────────────────────────────────────────────────────────
// Submit any T0 flag to unlock T1 file downloads.
// No registration. Session cookie only.

session_start();

// Only WEB-03 flag unlocks T1.
// WEB-01 and WEB-02 are stepping stones — players must chain all three.
define('UNLOCK_FLAG', 'FLAG{web_03_jwt_secret_leak_q2w8}');

// Honeypot flags — submitting these marks you
$HONEYPOTS = [
    'FLAG{t1_sudo_trap_gotcha}',
    'FLAG{crypto_fake_rsa_small_e_h4x0r}',
    'FLAG{t1_fake_creds_trap_7x2k}',
];

$msg      = '';
$msg_type = '';
$unlocked = !empty($_SESSION['t1_unlocked']);

// Handle flag submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $flag = trim($_POST['flag'] ?? '');

    if (in_array($flag, $HONEYPOTS, true)) {
        $msg      = '⚠ HONEYPOT DETECTED. That flag is fake. Someone is watching.';
        $msg_type = 'warn';
        @file_put_contents('/var/log/redteam/honeypot.log',
            date('Y-m-d H:i:s') . ' HONEYPOT submitted: ' . $flag .
            ' from ' . ($_SERVER['REMOTE_ADDR'] ?? '?') . "\n", FILE_APPEND);

    } elseif ($flag === UNLOCK_FLAG) {
        $_SESSION['t1_unlocked']   = true;
        $_SESSION['unlocked_flag'] = $flag;
        $unlocked = true;
        $msg      = '✔ Access granted. TIER 1 files are now unlocked.';
        $msg_type = 'ok';

    } elseif (!empty($flag)) {
        // Valid-looking flag format but wrong one
        if (preg_match('/^FLAG\{[^}]+\}$/', $flag)) {
            $msg      = 'Flag recognised but access not granted. You need to go deeper.';
            $msg_type = 'warn';
        } else {
            $msg      = 'Invalid flag format.';
            $msg_type = 'err';
        }
    }
}
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>NexusCorp — CTF</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0e14;color:#c5d0e0;font-family:'Courier New',monospace;font-size:14px;padding:32px 20px}
.wrap{max-width:860px;margin:0 auto}
h1{color:#5eb8ff;font-size:18px;letter-spacing:3px;margin-bottom:4px}
.sub{color:#556677;font-size:12px;margin-bottom:32px}
.section{margin-bottom:28px}
.section h2{color:#8899aa;font-size:12px;letter-spacing:2px;text-transform:uppercase;
            border-bottom:1px solid #1e2a38;padding-bottom:6px;margin-bottom:14px}
.msg{padding:10px 14px;border-radius:3px;margin-bottom:18px;font-size:13px}
.ok  {background:#0d2b1e;border:1px solid #1e6b42;color:#4caf88}
.err {background:#2b0d0d;border:1px solid #6b1e1e;color:#cf6679}
.warn{background:#2b230d;border:1px solid #6b551e;color:#cfaa46}
.submit-row{display:flex;gap:8px;align-items:center}
.submit-row input{flex:1;background:#0d1520;border:1px solid #2e3e52;
                  color:#c5d0e0;padding:9px 12px;border-radius:3px;
                  font-family:inherit;font-size:13px;max-width:460px}
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

  <!-- ── T0 FLAG SUBMIT ──────────────────────────────────────────── -->
  <div class="section">
    <h2>Submit T0 Flag → Unlock T1</h2>
    <form method="POST" autocomplete="off">
      <div class="submit-row">
        <input type="text" name="flag" placeholder="FLAG{...}" spellcheck="false">
        <button class="btn" type="submit">Submit</button>
      </div>
    </form>
    <p class="honeypot-note">⚠ Fake flags are scattered everywhere. Submitting one will be logged.</p>
  </div>

  <!-- ── T0 CHALLENGES ─────────────────────────────────────────── -->
  <div class="section">
    <h2>Tier 0 — External / Pre-Auth</h2>
    <div class="challenge-grid">
      <div class="card">
        <h3>WEB-01: Polyglot Upload</h3>
        <p>A file upload portal that checks extensions. Find the gap. Get a shell.</p>
        <a href="http://<?= $_SERVER['HTTP_HOST'] ?>:8001/" target="_blank">Open Challenge →</a>
      </div>
      <div class="card">
        <h3>WEB-02: ImageTragick RCE</h3>
        <p>A thumbnail generator. Something old lurks in the image processor.</p>
        <a href="http://<?= $_SERVER['HTTP_HOST'] ?>:8002/" target="_blank">Open Challenge →</a>
      </div>
      <div class="card">
        <h3>WEB-03: JWT Secret Leak</h3>
        <p>A corporate login portal. Secrets hide in plain JavaScript.</p>
        <a href="http://<?= $_SERVER['HTTP_HOST'] ?>:8003/" target="_blank">Open Challenge →</a>
      </div>
      <div class="card">
        <h3>SIEM: LFI Log Viewer</h3>
        <p>Internal monitoring panel. The log viewer trusts user input too much.</p>
        <a href="http://<?= $_SERVER['HTTP_HOST'] ?>:8080/" target="_blank">Open Challenge →</a>
      </div>
    </div>
  </div>

  <!-- ── T1 FILES ───────────────────────────────────────────────── -->
  <div class="section">
    <h2>Tier 1 — Files
      <?php if ($unlocked): ?>
        <span style="color:#4caf88;font-size:11px;margin-left:8px">🔓 UNLOCKED</span>
      <?php else: ?>
        <span style="color:#cf6679;font-size:11px;margin-left:8px">🔒 LOCKED</span>
      <?php endif; ?>
    </h2>

    <?php if ($unlocked): ?>
      <div class="file-grid">
        <?php
        $files = [
          // [display name, /files/ path]
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
        foreach ($files as [$label, $path]):
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
        Complete the WEB-03 challenge and submit its flag to unlock Tier 1 files.
        <br><span style="font-size:11px;margin-top:6px;display:block;color:#445566">
          Hint: WEB-01 → WEB-02 → WEB-03 → submit here
        </span>
      </div>
    <?php endif; ?>
  </div>

</div>
</body>
</html>
