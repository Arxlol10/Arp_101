<?php
session_start();

// ── T0: WEB-03 flag unlocks T1 ───────────────────────────────────────────
define('T0_UNLOCK_FLAG', 'FLAG{web_03_jwt_secret_leak_q2w8}');

// ── T1: ALL must be submitted to unlock T2 ───────────────────────────────
$T1_FLAGS = [
    'FLAG{t1_steg0_lsb_pixel_hunter_x7k}',
    'FLAG{t1_dtmf_audio_decode_p3q}',
    'FLAG{t1_mem_dump_analyst_r4m}',
    'FLAG{t1_deleted_but_not_gone_77j}',
    'FLAG{t1_xor_key_is_the_way_m2n}',
    'FLAG{t1_vigenere_cracked_4you}',
    'FLAG{t1_cr0n_h1dden_sch3dul3r}',
    'FLAG{t1_ex1f_metadata_l34k}',
    'FLAG{t1_su1d_find_privesc_9z2}',
];

// ── All 27 honeypot flags ─────────────────────────────────────────────────
$HONEYPOTS = [
    'FLAG{t0_robots_txt_trap_n1c3}',
    'FLAG{t0_dotenv_exposed_g0tcha}',
    'FLAG{t0_sql_dump_fake_fl4g}',
    'FLAG{t0_admin_notes_d3coy}',
    'FLAG{t0_config_bak_tr4p}',
    'FLAG{too_easy_try_harder}',
    'FLAG{nice_try_keep_looking}',
    'FLAG{t1_backup_found_nope}',
    'FLAG{t1_creds_too_obvious}',
    'FLAG{t1_pem_not_real_key}',
    'FLAG{t1_rsa_small_e_gotcha}',
    'FLAG{t1_log_grep_too_easy}',
    'FLAG{t1_sudo_trap_gotcha}',
    'FLAG{t2_eng_pass_tr4p}',
    'FLAG{t2_s3cret_key_f4ke}',
    'FLAG{t2_db_backup_n0pe}',
    'FLAG{t2_ssh_key_l0l}',
    'FLAG{t2_config_d3c0y}',
    'FLAG{t2_h1story_tr4p}',
    'FLAG{t2_n0tes_g0tcha}',
    'FLAG{t3_hp_ssh_key_h1dd3n_m4k}',
    'FLAG{t3_hp_l0gs_gr3p_f00l}',
    'FLAG{t3_hp_db_dump_j4g}',
    'FLAG{t3_hp_zip_cr4ck_d0y}',
    'FLAG{t3_hp_h1dd3n_txt_p2s}',
    'FLAG{t4_hp_ssh_z1p_f4k3_c9k}',
    'FLAG{t4_hp_b4sh_h1st_curl_x2a}',
];

// ── All real flags (for direction feedback only) ──────────────────────────
$ALL_REAL = array_merge([$T0_UNLOCK_FLAG], $T1_FLAGS, [
    'FLAG{web_01_polyglot_upload_bypass_k8m3}',
    'FLAG{web_02_imagetragick_rce_p9n7}',
    'FLAG{crypto_01_multi_layer_decrypt_n9k4}',
    'FLAG{t2_c4p_d4c_r34d_4bus3_x7k}',
    'FLAG{t2_bash_history_aes_d3crypt3d_k7x}',
    'FLAG{t2_mysql_dump_3xtr4ct_j9w}',
    'FLAG{t2_j0urn4l_b1n4ry_p4rs3_m2v}',
    'FLAG{t2_dm3sg_k3rn3l_fr4g_p8n}',
    'FLAG{t2_r3v3rs3_v4l1d4t0r_q5z}',
    'FLAG{t2_ssh_k3y_4ss3mbl3d_e2r}',
    'FLAG{t3_fmt_str_0v3rwr1t3_y5v}',
    'FLAG{t3_h34p_tc4ch3_p01s0n1ng_n9k4}',
    'FLAG{t3_10g_4n4ly515_4n0m4ly_x7k}',
    'FLAG{t3_p0rt_kn0ck1ng_s3qu3nc3_v2b}',
    'FLAG{t3_k3rn3l_m0dul3_10ctl_pwn_b8w}',
    'FLAG{t4_f1n4l_r00t_d3crypt10n_m4st3r}',
    'FLAG{RWT_CTF_M4ST3RM1ND_C0MPL3T3_9X2}',
]);

// ── Session state ─────────────────────────────────────────────────────────
if (!isset($_SESSION['t1_submitted'])) $_SESSION['t1_submitted'] = [];
$t1_unlocked = !empty($_SESSION['t1_unlocked']);
$t2_unlocked = !empty($_SESSION['t2_unlocked']);
$msg = ''; $msg_type = '';

// ── Handle submission ─────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $flag = trim($_POST['flag'] ?? '');

    if (in_array($flag, $HONEYPOTS, true)) {
        $msg      = '⚠ HONEYPOT DETECTED. That flag is fake. This has been logged.';
        $msg_type = 'warn';
        @file_put_contents('/var/log/redteam/honeypot.log',
            date('Y-m-d H:i:s') . ' HONEYPOT: ' . $flag .
            ' from ' . ($_SERVER['REMOTE_ADDR'] ?? '?') . "\n", FILE_APPEND);

    } elseif ($flag === T0_UNLOCK_FLAG) {
        if (!$t1_unlocked) {
            $_SESSION['t1_unlocked'] = true;
            $t1_unlocked = true;
            $msg = '✔ Flag accepted. Tier 1 files are now unlocked.';
            $msg_type = 'ok';
        } else {
            $msg = 'Tier 1 already unlocked.'; $msg_type = 'warn';
        }

    } elseif (in_array($flag, $T1_FLAGS, true)) {
        if (!$t1_unlocked) {
            $msg = 'Unlock Tier 1 first.'; $msg_type = 'err';
        } elseif (in_array($flag, $_SESSION['t1_submitted'], true)) {
            $msg = 'Already submitted. Keep going.'; $msg_type = 'warn';
        } else {
            $_SESSION['t1_submitted'][] = $flag;
            $remaining = count($T1_FLAGS) - count($_SESSION['t1_submitted']);
            if ($remaining === 0) {
                $_SESSION['t2_unlocked'] = true;
                $t2_unlocked = true;
                $msg = '✔ All Tier 1 flags submitted. Tier 2 files are now unlocked!';
                $msg_type = 'ok';
            } else {
                $msg = "✔ Flag accepted. {$remaining} more needed to unlock Tier 2.";
                $msg_type = 'ok';
            }
        }

    } elseif (!empty($flag)) {
        if (preg_match('/^FLAG\{[^}]+\}$/', $flag)) {
            $msg = in_array($flag, $ALL_REAL, true)
                ? 'Valid flag — but not submitted here. Keep digging.'
                : 'Not a valid flag.';
            $msg_type = 'warn';
        } else {
            $msg = 'Invalid flag format.'; $msg_type = 'err';
        }
    }
}

$t1_done  = count($_SESSION['t1_submitted']);
$t1_total = count($T1_FLAGS);
$t1_pct   = $t1_total ? (int)($t1_done / $t1_total * 100) : 0;
$host     = htmlspecialchars(explode(':', $_SERVER['HTTP_HOST'])[0]);
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>NexusCorp — CTF</title>
<!-- Internal recon note: asset inventory at /internal/admin_notes.md -->
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0e14;color:#c5d0e0;font-family:'Courier New',monospace;font-size:14px;padding:32px 20px}
.wrap{max-width:960px;margin:0 auto}
h1{color:#5eb8ff;font-size:18px;letter-spacing:3px;margin-bottom:4px}
.sub{color:#556677;font-size:12px;margin-bottom:32px}
.section{margin-bottom:32px}
.section h2{color:#8899aa;font-size:12px;letter-spacing:2px;text-transform:uppercase;
            border-bottom:1px solid #1e2a38;padding-bottom:6px;margin-bottom:14px;
            display:flex;align-items:center;gap:10px}
.msg{padding:10px 14px;border-radius:3px;margin-bottom:18px;font-size:13px}
.ok  {background:#0d2b1e;border:1px solid #1e6b42;color:#4caf88}
.err {background:#2b0d0d;border:1px solid #6b1e1e;color:#cf6679}
.warn{background:#2b230d;border:1px solid #6b551e;color:#cfaa46}
.submit-row{display:flex;gap:8px}
.submit-row input{flex:1;background:#0d1520;border:1px solid #2e3e52;color:#c5d0e0;
                  padding:9px 12px;border-radius:3px;font-family:inherit;font-size:13px;max-width:480px}
.submit-row input:focus{outline:none;border-color:#5eb8ff}
.btn{padding:9px 18px;border-radius:3px;font-family:inherit;font-size:13px;
     cursor:pointer;border:1px solid #1e6b42;background:#0d2b1e;color:#4caf88}
.btn:hover{background:#0d3b26}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.card{background:#0d1520;border:1px solid #1e2a38;border-radius:3px;padding:14px}
.card.honey{border-color:#2a1a00}
.card h3{font-size:13px;color:#cdd8e8;margin-bottom:6px}
.card.honey h3{color:#8a7040}
.card p{font-size:12px;color:#7a8fa0;line-height:1.5;margin-bottom:10px}
.card.honey p{color:#5a4a30}
.card a{display:inline-block;padding:5px 12px;border-radius:3px;font-size:12px;
        border:1px solid #1e5090;background:#0d2240;color:#5eb8ff;text-decoration:none}
.card.honey a{border-color:#3a2a00;background:#1a1000;color:#8a7040}
.card a:hover{background:#0d3260}
.card.honey a:hover{background:#2a1a00}
.lock-box{background:#1a0d0d;border:1px solid #3d1a1a;border-radius:3px;
          padding:18px;text-align:center;color:#8899aa;font-size:13px}
.lock-box strong{color:#cf6679;display:block;font-size:15px;margin-bottom:6px}
.file-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px}
.file-item{background:#0d1520;border:1px solid #1e6b42;border-radius:3px;
           padding:12px;display:flex;justify-content:space-between;align-items:center}
.file-item span{font-size:12px;color:#8899aa}
.file-item a{padding:4px 10px;border-radius:3px;font-size:12px;border:1px solid #1e6b42;
             background:#0d2b1e;color:#4caf88;text-decoration:none}
.badge{font-size:11px;padding:2px 8px;border-radius:2px}
.badge-ok  {background:#0d2b1e;border:1px solid #1e6b42;color:#4caf88}
.badge-lock{background:#1a0d0d;border:1px solid #3d1a1a;color:#cf6679}
.badge-part{background:#1a1500;border:1px solid #4d3d00;color:#cfaa46}
.prog-wrap{margin:0 0 14px}
.prog-label{font-size:11px;color:#556677;margin-bottom:4px}
.prog{background:#1e2a38;border-radius:3px;height:6px}
.prog-fill{height:100%;border-radius:3px;background:#4caf88;transition:.4s}
.note{font-size:11px;color:#556677;margin-top:10px}
.asset-table{width:100%;border-collapse:collapse;font-size:12px}
.asset-table td{padding:7px 10px;border-bottom:1px solid #0d1520;color:#7a8fa0}
.asset-table td:first-child{color:#5eb8ff;width:220px}
.asset-table tr:hover td{background:#0d1520}
.asset-table a{color:#5eb8ff;text-decoration:none}
.asset-table a:hover{text-decoration:underline}
.tag{font-size:10px;padding:1px 6px;border-radius:2px;margin-left:6px}
.tag-warn{background:#2b230d;border:1px solid #4d3d00;color:#cfaa46}
</style>
</head>
<body>
<div class="wrap">

<h1>[ NexusCorp RedTeam CTF ]</h1>
<p class="sub">Compromise the infrastructure. Capture the flags.</p>

<?php if ($msg): ?>
  <div class="msg <?= $msg_type ?>"><?= htmlspecialchars($msg) ?></div>
<?php endif; ?>

<!-- ── FLAG SUBMIT ─────────────────────────────────────────────────────── -->
<div class="section">
  <h2>Submit Flag</h2>
  <form method="POST" autocomplete="off">
    <div class="submit-row">
      <input type="text" name="flag" placeholder="FLAG{...}" spellcheck="false" autofocus>
      <button class="btn" type="submit">Submit</button>
    </div>
  </form>
  <p class="note">⚠ Fake flags are planted throughout the system. Submitting one will be logged and costs −50 pts.</p>
</div>

<!-- ── KNOWN ASSETS (honeypot bait + real recon finds) ───────────────────
     WEB-01 is hidden in robots.txt (/secure-upload → :8001)
     WEB-02 is hidden in .env (THUMB_SERVICE_URL → :8002)
     Players must do recon to find them. Shown here are the publicly
     visible assets — some real, most traps.
-->
<div class="section">
  <h2>
    Discovered Assets — Tier 0
    <span class="badge <?= $t1_unlocked ? 'badge-ok' : 'badge-lock' ?>"><?= $t1_unlocked ? 'CLEARED' : 'ACTIVE' ?></span>
  </h2>
  <table class="asset-table">
    <tr>
      <td>/robots.txt</td>
      <td>Standard crawler policy file. Worth reading carefully.
        <a href="/robots.txt" target="_blank">View →</a></td>
    </tr>
    <tr>
      <td>/.env</td>
      <td>Environment config accidentally left public. Credentials inside?
        <a href="/.env" target="_blank">View →</a></td>
    </tr>
    <tr>
      <td>/backup/backup_db.sql</td>
      <td>SQL database backup. Someone forgot to lock this down.
        <a href="/backup/backup_db.sql" target="_blank">View →</a></td>
    </tr>
    <tr>
      <td>/config.php.bak</td>
      <td>Backup of the PHP config. Hardcoded credentials?
        <a href="/config.php.bak" target="_blank">View →</a></td>
    </tr>
    <tr>
      <td>/internal/admin_notes.md</td>
      <td>Internal admin notes. Not meant to be public.
        <a href="/internal/admin_notes.md" target="_blank">View →</a></td>
    </tr>
  </table>
</div>

<!-- ── TIER 0 VISIBLE CHALLENGES ──────────────────────────────────────── -->
<div class="section">
  <h2>Tier 0 — Challenges</h2>
  <div class="grid">

    <!-- REAL: WEB-03 (visible) -->
    <div class="card">
      <h3>CORP-PORTAL: JWT Auth</h3>
      <p>NexusCorp employee portal. Login required. Maybe the authentication can be bypassed.</p>
      <a href="http://<?= $host ?>:8003/" target="_blank">Open →</a>
    </div>

    <!-- REAL: SIEM (visible) -->
    <div class="card">
      <h3>SIEM: Log Viewer</h3>
      <p>Internal monitoring panel. Log path is user-controlled.</p>
      <a href="http://<?= $host ?>:8080/" target="_blank">Open →</a>
    </div>

    <!-- HONEYPOT: CRYPTO-02 Caesar (looks easy, flag costs -50) -->
    <div class="card honey">
      <h3>CRYPTO-02: Caesar Cipher <span class="tag tag-warn">easy?</span></h3>
      <p>A simple ROT cipher. Looks straightforward. Decode the message and submit the flag.</p>
      <a href="/files/crypto/crypto02_caesar.txt" target="_blank">Get File →</a>
    </div>

    <!-- HONEYPOT: CRYPTO-03 Hash Crack (looks easy, flag costs -50) -->
    <div class="card honey">
      <h3>CRYPTO-03: Hash Cracker <span class="tag tag-warn">easy?</span></h3>
      <p>An MD5 hash. Crack it and submit. Common wordlists should work.</p>
      <a href="/files/crypto/crypto03_hash.txt" target="_blank">Get File →</a>
    </div>

  </div>
  <p class="note" style="margin-top:12px">
    💡 Not all services are listed here. Standard recon applies — check common files, headers, and ports.
  </p>
</div>

<!-- ── TIER 1 FILES ────────────────────────────────────────────────────── -->
<div class="section">
  <h2>
    Tier 1 — Files
    <?php if ($t2_unlocked): ?>
      <span class="badge badge-ok">CLEARED</span>
    <?php elseif ($t1_unlocked): ?>
      <span class="badge badge-part"><?= $t1_done ?>/<?= $t1_total ?> FLAGS</span>
    <?php else: ?>
      <span class="badge badge-lock">LOCKED</span>
    <?php endif; ?>
  </h2>

  <?php if ($t1_unlocked): ?>
    <?php if (!$t2_unlocked): ?>
      <div class="prog-wrap">
        <div class="prog-label">Tier 2 unlock: <?= $t1_done ?>/<?= $t1_total ?> Tier 1 flags submitted</div>
        <div class="prog"><div class="prog-fill" style="width:<?= $t1_pct ?>%"></div></div>
      </div>
    <?php endif; ?>
    <div class="file-grid">
      <?php foreach ([
        ['STEGO-01: suspicious.png',   'stego/suspicious.png'],
        ['STEGO-01: README',           'stego/stego01_README.txt'],
        ['STEGO-02: transmission.wav', 'stego/transmission.wav'],
        ['STEGO-02: hint.txt',         'stego/stego02_hint.txt'],
        ['FORENSICS-01: memory.dmp',   'forensics/memory.dmp'],
        ['FORENSICS-01: README',       'forensics/forensics01_README.txt'],
        ['FORENSICS-02: disk.img',     'forensics/disk.img'],
        ['FORENSICS-02: README',       'forensics/forensics02_README.txt'],
        ['CRYPTO-04: xor_cipher.bin',  'crypto/xor_cipher.bin'],
        ['CRYPTO-04: note.txt',        'crypto/note.txt'],
        ['CRYPTO-04: README',          'crypto/crypto04_README.txt'],
        ['CRYPTO-05: vigenere.txt',    'crypto/vigenere.txt'],
        ['CRYPTO-05: README',          'crypto/crypto05_README.txt'],
      ] as [$label, $path]):
        $exists = file_exists('/var/www/html/files/' . $path); ?>
        <div class="file-item">
          <span><?= htmlspecialchars($label) ?></span>
          <?php if ($exists): ?>
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
      Complete Tier 0 and submit the correct flag to unlock.
    </div>
  <?php endif; ?>
</div>

<!-- ── TIER 2 FILES ────────────────────────────────────────────────────── -->
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
      <?php foreach ([
        ['CRYPTO-06: encrypted bash history', 'crypto/encrypted_bash_history.enc'],
        ['CRYPTO-06: analyst note',           'crypto/analyst_note.txt'],
        ['FORENSICS-03: analyst_db.sql',      'forensics/analyst_db.sql'],
        ['FORENSICS-05: dmesg.log',           'forensics/dmesg.log'],
        ['REVERSE-01: license_validator.py',  'misc/license_validator.py'],
      ] as [$label, $path]):
        $exists = file_exists('/var/www/html/files/' . $path); ?>
        <div class="file-item">
          <span><?= htmlspecialchars($label) ?></span>
          <?php if ($exists): ?>
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
        Submit all <?= $t1_total ?> Tier 1 flags to unlock.
        <span style="font-size:11px;display:block;margin-top:5px;color:#445566"><?= $t1_done ?>/<?= $t1_total ?> submitted</span>
      <?php else: ?>
        Complete Tier 0 first.
      <?php endif; ?>
    </div>
  <?php endif; ?>
</div>

</div>
</body>
</html>
