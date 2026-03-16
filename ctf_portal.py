#!/usr/bin/env python3
"""
NexusCorp CTF Progression Portal
=================================
- Teams register and log in
- T0 challenges are always visible
- Submitting T0 flags unlocks T1 files
- Submitting T1 flags unlocks T2, etc.
- Files served through Flask with tier check (no nginx autoindex)
- Honeypot flag submissions tracked and penalised
"""

import os, sqlite3, hashlib, secrets, mimetypes
from datetime import datetime
from functools import wraps
from flask import (Flask, request, session, redirect, url_for,
                   send_file, abort, g)
from markupsafe import escape

app = Flask(__name__)
app.secret_key = os.environ.get("PORTAL_SECRET", secrets.token_hex(32))

DB_PATH    = "/var/lib/ctf_portal/portal.db"
FILES_ROOT = "/var/www/html/files"

# ── Challenge registry ────────────────────────────────────────────────────────
# Structure: tier → list of challenge dicts
# flag_hash: sha256 of the real flag (never stored in plaintext in DB)
# unlock_tier: completing this challenge contributes toward unlocking that tier
# points: awarded on first solve
# is_honeypot: deduct points instead

CHALLENGES = {
    0: [
        {
            "id": "web01",
            "name": "WEB-01: Polyglot Upload",
            "points": 250,
            "desc": "A file upload portal that checks extensions. Find the gap.",
            "url_label": ":8001",
            "url_path": ":8001",
            "flag": "FLAG{web_01_polyglot_upload_bypass_k8m3}",
        },
        {
            "id": "web02",
            "name": "WEB-02: ImageTragick RCE",
            "points": 300,
            "desc": "A thumbnail generator. Something old lurks in the image processor.",
            "url_label": ":8002",
            "url_path": ":8002",
            "flag": "FLAG{web_02_imagetragick_rce_p9n7}",
        },
        {
            "id": "web03",
            "name": "WEB-03: JWT Secret Leak",
            "points": 300,
            "desc": "A corporate login portal. Secrets hide in plain JavaScript.",
            "url_label": ":8003",
            "url_path": ":8003",
            "flag": "FLAG{web_03_jwt_secret_leak_q2w8}",
        },
        {
            "id": "web_admin",
            "name": "SIEM: LFI in Log Viewer",
            "points": 350,
            "desc": "Internal monitoring panel. The log viewer trusts user input too much.",
            "url_label": ":8080",
            "url_path": ":8080",
            "flag": "FLAG{web_siem_lfi_logs_exposed_n9p1}",
        },
        {
            "id": "crypto01",
            "name": "CRYPTO-01: Multi-Layer Encryption",
            "points": 300,
            "desc": "Peel the layers. Check /files/crypto/ once T0 is cleared.",
            "url_label": None,
            "url_path": None,
            "flag": "FLAG{crypto_01_multi_layer_decrypt_n9k4}",
        },
    ],
    1: [
        {
            "id": "stego01",
            "name": "STEGO-01: Hidden in Plain Pixels",
            "points": 350,
            "desc": "Something lives in the least significant bits.",
            "file": "stego/suspicious.png",
            "flag": "FLAG{t1_st3g0_lsb_r3d_ch4nn3l_x9p2}",
        },
        {
            "id": "stego02",
            "name": "STEGO-02: Signal in the Noise",
            "points": 400,
            "desc": "An audio transmission. Listen carefully — or don't listen at all.",
            "file": "stego/transmission.wav",
            "flag": "FLAG{t1_w4v_sp3ctr0gr4m_m0rs3_k2n7}",
        },
        {
            "id": "forensics01",
            "name": "FORENSICS-01: Memory Dump",
            "points": 450,
            "desc": "A process image captured mid-run. What was in memory?",
            "file": "forensics/memory.dmp",
            "flag": "FLAG{t1_m3m_dump_str1ngs_4n4lys1s_w3r}",
        },
        {
            "id": "forensics02",
            "name": "FORENSICS-02: Disk Image",
            "points": 450,
            "desc": "A carved disk image. Something was deleted but not wiped.",
            "file": "forensics/disk.img",
            "flag": "FLAG{t1_d1sk_c4rv3_d3l3t3d_r3c0v3r_p5q}",
        },
        {
            "id": "crypto04",
            "name": "CRYPTO-04: XOR Cipher",
            "points": 300,
            "desc": "A binary blob and a note. The key is shorter than you think.",
            "file": "crypto/xor_cipher.bin",
            "flag": "FLAG{t1_x0r_k3y_r3p34t_br0k3n_m9x3}",
        },
        {
            "id": "crypto05",
            "name": "CRYPTO-05: Vigenère",
            "points": 300,
            "desc": "Classical substitution. The key is hidden in the ciphertext itself.",
            "file": "crypto/vigenere.txt",
            "flag": "FLAG{t1_v1g3n3r3_k3y_1n_c1ph3r_y7w2}",
        },
        {
            "id": "privesc01",
            "name": "PRIVESC-01: SUID find",
            "points": 500,
            "desc": "You have a www-data shell. Find an SUID binary that helps you move up.",
            "file": None,
            "flag": "FLAG{t1_su1d_find_privesc_9z2}",
        },
    ],
    2: [
        {
            "id": "binary01",
            "name": "BINARY-01: Capability Abuse",
            "points": 500,
            "desc": "A tool with a special capability. It can read more than it should.",
            "file": None,
            "flag": "FLAG{t2_c4p_d4c_r34d_4bus3_x7k}",
        },
        {
            "id": "crypto06",
            "name": "CRYPTO-06: Encrypted Bash History",
            "points": 400,
            "desc": "Someone encrypted their bash history. The key is somewhere obvious.",
            "file": "crypto/encrypted_bash_history.enc",
            "flag": "FLAG{t2_3ncrypt3d_h1st0ry_k3y_r3us3_n4p}",
        },
        {
            "id": "forensics03",
            "name": "FORENSICS-03: Database Artefact",
            "points": 450,
            "desc": "An analyst's database. Deleted rows leave shadows.",
            "file": "forensics/analyst_db.sql",
            "flag": "FLAG{t2_sql1t3_d3l3t3d_r0w_r3c0v3r_k8w}",
        },
        {
            "id": "reverse01",
            "name": "REVERSE-01: License Validator",
            "points": 500,
            "desc": "A Python validator that generates valid keys. Work backwards.",
            "file": "misc/license_validator.py",
            "flag": "FLAG{t2_r3v3rs3d_l1c3ns3_4lg0_p2q9}",
        },
        {
            "id": "sshkeyhunt",
            "name": "SSHKeyHunt: Assemble the Key",
            "points": 600,
            "desc": "Fragments of an SSH private key are scattered across the system. Find them all.",
            "file": None,
            "flag": "FLAG{t2_ssh_k3y_4ss3mbl3d_e2r}",
        },
    ],
    3: [
        {
            "id": "binary02",
            "name": "BINARY-02: Format String",
            "points": 600,
            "desc": "A service with a printf bug. Overwrite what you need.",
            "file": None,
            "flag": "FLAG{t3_fmt_str_0v3rwr1t3_y5v}",
        },
        {
            "id": "binary03",
            "name": "BINARY-03: Heap Tcache",
            "points": 700,
            "desc": "Heap allocator internals. Poison the cache.",
            "file": None,
            "flag": "FLAG{t3_h34p_tc4ch3_p01s0n1ng_n9k4}",
        },
        {
            "id": "privesc03",
            "name": "PRIVESC-03: Kernel Module IOCTL",
            "points": 700,
            "desc": "A custom kernel module exposes an IOCTL interface. Read the source.",
            "file": None,
            "flag": "FLAG{t3_k3rn3l_m0dul3_10ctl_pwn_b8w}",
        },
    ],
    4: [
        {
            "id": "root01",
            "name": "ROOT-01: Final Fragment",
            "points": 1000,
            "desc": "An encrypted fragment in /root/. Decrypt it to get the final piece.",
            "file": None,
            "flag": "FLAG{t4_r00t_fr4gm3nt_0n3_d3crypt3d_z9p}",
        },
        {
            "id": "root02",
            "name": "ROOT-02: Master Flag",
            "points": 1000,
            "desc": "Combine all fragments. Run verify_master.py as root to generate the final flag.",
            "file": None,
            "flag": "FLAG{t4_m4st3r_fl4g_4ss3mbl3d_all_t13rs_c0mpl3t3}",
        },
    ],
}

# Honeypot flags — submitting these costs points
HONEYPOTS = {
    "FLAG{t1_sudo_trap_gotcha}",
    "FLAG{crypto_fake_rsa_small_e_h4x0r}",
    "FLAG{t1_fake_creds_trap_7x2k}",
    "FLAG{t3_fake_kernel_exploit_n0p3}",
}

# How many T(n) solves needed to unlock T(n+1) files
UNLOCK_THRESHOLD = {0: 3, 1: 4, 2: 3, 3: 2}  # out of total in tier

# Build a flat flag→challenge lookup
FLAG_MAP = {}
for tier_challenges in CHALLENGES.values():
    for ch in tier_challenges:
        FLAG_MAP[ch["flag"]] = ch

# ── Database ──────────────────────────────────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db: db.close()

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.executescript("""
        CREATE TABLE IF NOT EXISTS teams (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT UNIQUE NOT NULL,
            pw_hash   TEXT NOT NULL,
            token     TEXT UNIQUE NOT NULL,
            score     INTEGER DEFAULT 0,
            created   TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS solves (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id     INTEGER NOT NULL,
            challenge   TEXT NOT NULL,
            tier        INTEGER NOT NULL,
            points      INTEGER NOT NULL,
            solved_at   TEXT DEFAULT (datetime('now')),
            UNIQUE(team_id, challenge)
        );
        CREATE TABLE IF NOT EXISTS penalties (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id     INTEGER NOT NULL,
            flag_tried  TEXT NOT NULL,
            penalty     INTEGER DEFAULT 50,
            at          TEXT DEFAULT (datetime('now'))
        );
    """)
    db.commit()
    db.close()

# ── Auth helpers ──────────────────────────────────────────────────────────────

def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def get_team():
    tid = session.get("team_id")
    if not tid:
        return None
    return get_db().execute("SELECT * FROM teams WHERE id=?", (tid,)).fetchone()

def login_required(f):
    @wraps(f)
    def wrapped(*a, **kw):
        if not session.get("team_id"):
            return redirect(url_for("login"))
        return f(*a, **kw)
    return wrapped

# ── Tier helpers ──────────────────────────────────────────────────────────────

def team_solves(team_id):
    rows = get_db().execute(
        "SELECT challenge, tier FROM solves WHERE team_id=?", (team_id,)
    ).fetchall()
    return {r["challenge"]: r["tier"] for r in rows}

def tier_unlocked(team_id, tier):
    """Tier 0 always unlocked. Higher tiers need enough solves in tier-1."""
    if tier == 0:
        return True
    prev = tier - 1
    count = get_db().execute(
        "SELECT COUNT(*) FROM solves WHERE team_id=? AND tier=?",
        (team_id, prev)
    ).fetchone()[0]
    threshold = UNLOCK_THRESHOLD.get(prev, 99)
    return count >= threshold

def highest_unlocked(team_id):
    for t in range(4, -1, -1):
        if tier_unlocked(team_id, t):
            return t
    return 0

# ── Templates ─────────────────────────────────────────────────────────────────

BASE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>NexusCorp CTF</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0e14;color:#c5d0e0;font-family:'Courier New',monospace;font-size:14px}
a{color:#5eb8ff;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1100px;margin:0 auto;padding:24px}
header{border-bottom:1px solid #1e2a38;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}
header h1{color:#5eb8ff;font-size:20px;letter-spacing:2px}
header .nav a{margin-left:16px;color:#8899aa}
.flash{padding:10px 14px;margin-bottom:18px;border-radius:4px;font-size:13px}
.flash.ok{background:#0d2b1e;border:1px solid #1e6b42;color:#4caf88}
.flash.err{background:#2b0d0d;border:1px solid #6b1e1e;color:#cf6679}
.flash.warn{background:#2b230d;border:1px solid #6b551e;color:#cfaa46}
.tier-block{margin-bottom:32px}
.tier-header{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.tier-badge{background:#1e2a38;border:1px solid #2e3e52;padding:4px 12px;border-radius:3px;font-size:12px;color:#8899aa;letter-spacing:1px}
.tier-badge.unlocked{border-color:#1e6b42;color:#4caf88}
.tier-badge.locked{border-color:#6b1e1e;color:#cf6679}
.challenge-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.card{background:#0d1520;border:1px solid #1e2a38;border-radius:4px;padding:16px}
.card.solved{border-color:#1e6b42}
.card.locked-card{opacity:.5}
.card h3{font-size:13px;color:#cdd8e8;margin-bottom:8px}
.card .pts{font-size:11px;color:#5eb8ff;margin-bottom:8px}
.card p{font-size:12px;color:#7a8fa0;margin-bottom:10px;line-height:1.5}
.card .solved-tag{color:#4caf88;font-size:11px}
.card .link-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.btn{display:inline-block;padding:5px 12px;border-radius:3px;font-size:12px;font-family:inherit;cursor:pointer;border:1px solid}
.btn-blue{background:#0d2240;border-color:#1e5090;color:#5eb8ff}
.btn-blue:hover{background:#0d3260}
.btn-green{background:#0d2b1e;border-color:#1e6b42;color:#4caf88}
.btn-green:hover{background:#0d3b26}
.lock-msg{background:#1a0d0d;border:1px solid #3d1a1a;padding:20px;border-radius:4px;text-align:center;color:#8899aa;margin-bottom:12px}
.lock-msg strong{color:#cf6679}
.submit-form{display:flex;gap:8px}
.submit-form input{flex:1;background:#0d1520;border:1px solid #2e3e52;color:#c5d0e0;padding:6px 10px;border-radius:3px;font-family:inherit;font-size:13px}
.submit-form input:focus{outline:none;border-color:#5eb8ff}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:8px 12px;border-bottom:1px solid #1e2a38;color:#5eb8ff;font-size:12px}
td{padding:8px 12px;border-bottom:1px solid #0d1520;font-size:13px}
tr:hover td{background:#0d1520}
.rank1{color:#ffd700}
.rank2{color:#c0c0c0}
.rank3{color:#cd7f32}
.form-box{max-width:420px;margin:0 auto;background:#0d1520;border:1px solid #1e2a38;padding:28px;border-radius:4px}
.form-box h2{margin-bottom:20px;color:#5eb8ff;font-size:16px}
.field{margin-bottom:14px}
.field label{display:block;margin-bottom:5px;font-size:12px;color:#8899aa}
.field input{width:100%;background:#0a0e14;border:1px solid #2e3e52;color:#c5d0e0;padding:8px 10px;border-radius:3px;font-family:inherit;font-size:13px}
.field input:focus{outline:none;border-color:#5eb8ff}
.progress{background:#1e2a38;border-radius:3px;height:6px;margin-top:4px}
.progress-fill{height:100%;border-radius:3px;background:#4caf88;transition:.3s}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>[ NexusCorp RedTeam CTF ]</h1>
  <div class="nav">
    {% if team %}
      <a href="/">Challenges</a>
      <a href="/scoreboard">Scoreboard</a>
      <span style="color:#4caf88;margin-left:16px">▶ {{ team.name }}</span>
      <a href="/logout" style="margin-left:16px;color:#cf6679">logout</a>
    {% else %}
      <a href="/login">Login</a>
      <a href="/register">Register</a>
      <a href="/scoreboard">Scoreboard</a>
    {% endif %}
  </div>
</header>
{% for f in flashes %}<div class="flash {{ f[0] }}">{{ f[1] }}</div>{% endfor %}
{{ body }}
</div>
</body>
</html>"""

def render(body, flashes=None, team=None):
    from jinja2 import Template
    return Template(BASE).render(body=body, flashes=flashes or [], team=team)

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/register", methods=["GET","POST"])
def register():
    flashes = []
    if request.method == "POST":
        name = request.form.get("name","").strip()[:32]
        pw   = request.form.get("pw","")
        if not name or not pw:
            flashes.append(("err","Name and password required."))
        elif len(pw) < 6:
            flashes.append(("err","Password must be at least 6 characters."))
        else:
            try:
                token = secrets.token_urlsafe(16)
                get_db().execute(
                    "INSERT INTO teams (name,pw_hash,token) VALUES (?,?,?)",
                    (name, hash_pw(pw), token)
                )
                get_db().commit()
                row = get_db().execute("SELECT id FROM teams WHERE name=?", (name,)).fetchone()
                session["team_id"] = row["id"]
                return redirect(url_for("index"))
            except sqlite3.IntegrityError:
                flashes.append(("err","Team name already taken."))

    body = """
<div class="form-box">
  <h2>Register Team</h2>
  <form method="POST">
    <div class="field"><label>Team Name</label>
      <input name="name" maxlength="32" placeholder="RedTeam_X" required></div>
    <div class="field"><label>Password</label>
      <input type="password" name="pw" placeholder="min 6 chars" required></div>
    <button class="btn btn-blue" style="width:100%;padding:9px">Register</button>
  </form>
  <p style="margin-top:14px;font-size:12px;color:#556677;text-align:center">
    Already registered? <a href="/login">Log in</a>
  </p>
</div>"""
    return render(body, flashes)

@app.route("/login", methods=["GET","POST"])
def login():
    flashes = []
    if request.method == "POST":
        name = request.form.get("name","").strip()
        pw   = request.form.get("pw","")
        row  = get_db().execute(
            "SELECT * FROM teams WHERE name=? AND pw_hash=?",
            (name, hash_pw(pw))
        ).fetchone()
        if row:
            session["team_id"] = row["id"]
            return redirect(url_for("index"))
        flashes.append(("err","Invalid team name or password."))

    body = """
<div class="form-box">
  <h2>Team Login</h2>
  <form method="POST">
    <div class="field"><label>Team Name</label>
      <input name="name" required></div>
    <div class="field"><label>Password</label>
      <input type="password" name="pw" required></div>
    <button class="btn btn-blue" style="width:100%;padding:9px">Login</button>
  </form>
  <p style="margin-top:14px;font-size:12px;color:#556677;text-align:center">
    New team? <a href="/register">Register</a>
  </p>
</div>"""
    return render(body, flashes)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/")
@login_required
def index():
    team   = get_team()
    solves = team_solves(team["id"])
    flashes = []

    # Handle flag submission
    submitted = request.args.get("flag","").strip()
    if submitted:
        if submitted in HONEYPOTS:
            get_db().execute(
                "INSERT OR IGNORE INTO penalties (team_id,flag_tried) VALUES (?,?)",
                (team["id"], submitted)
            )
            get_db().execute(
                "UPDATE teams SET score=MAX(0,score-50) WHERE id=?", (team["id"],)
            )
            get_db().commit()
            flashes.append(("warn",
                f"⚠ HONEYPOT! That flag is fake. −50 points. Someone is watching."))
        elif submitted in FLAG_MAP:
            ch = FLAG_MAP[submitted]
            if ch["id"] in solves:
                flashes.append(("warn","Already solved: " + ch["name"]))
            else:
                ch_tier = next(
                    t for t, chs in CHALLENGES.items()
                    if any(c["id"] == ch["id"] for c in chs)
                )
                get_db().execute(
                    "INSERT OR IGNORE INTO solves (team_id,challenge,tier,points) VALUES (?,?,?,?)",
                    (team["id"], ch["id"], ch_tier, ch["points"])
                )
                get_db().execute(
                    "UPDATE teams SET score=score+? WHERE id=?",
                    (ch["points"], team["id"])
                )
                get_db().commit()
                solves[ch["id"]] = ch_tier

                # Check if this unlocked a new tier
                for t in range(1, 5):
                    if tier_unlocked(team["id"], t):
                        prev_count = get_db().execute(
                            "SELECT COUNT(*) FROM solves WHERE team_id=? AND tier=?",
                            (team["id"], t-1)
                        ).fetchone()[0]
                        threshold  = UNLOCK_THRESHOLD.get(t-1, 99)
                        if prev_count == threshold:
                            flashes.append(("ok",
                                f"🔓 TIER {t} UNLOCKED! New challenges and files are now available."))

                flashes.append(("ok",
                    f"✔ Correct! +{ch['points']} pts — {ch['name']}"))
        else:
            flashes.append(("err","Invalid flag. Keep digging."))

    # Reload team for updated score
    team = get_team()

    # Build page
    tier_names = {
        0: "TIER 0 — External / Pre-Auth",
        1: "TIER 1 — www-data Shell",
        2: "TIER 2 — analyst User",
        3: "TIER 3 — engineer User",
        4: "TIER 4 — root",
    }

    sections = []
    for tier in range(5):
        unlocked = tier_unlocked(team["id"], tier)
        threshold = UNLOCK_THRESHOLD.get(tier - 1, 0)
        prev_count = 0 if tier == 0 else get_db().execute(
            "SELECT COUNT(*) FROM solves WHERE team_id=? AND tier=?",
            (team["id"], tier-1)
        ).fetchone()[0]
        prev_total = len(CHALLENGES.get(tier-1, []))

        badge_cls = "unlocked" if unlocked else "locked"
        badge_txt = "UNLOCKED" if unlocked else f"LOCKED — need {threshold}/{prev_total} T{tier-1} solves"

        cards = []
        for ch in CHALLENGES.get(tier, []):
            solved = ch["id"] in solves
            card_cls = "solved" if solved else ("locked-card" if not unlocked else "")

            links = ""
            # Challenge URL link
            if ch.get("url_path") and unlocked:
                host = request.host.split(":")[0]
                links += f'<a class="btn btn-blue" href="http://{host}{ch["url_path"]}" target="_blank">Open Challenge</a>'

            # File download link
            if ch.get("file") and unlocked:
                links += f' <a class="btn btn-blue" href="/file/{ch["file"]}">Download File</a>'

            solved_tag = '<span class="solved-tag">✔ SOLVED</span>' if solved else ""

            cards.append(f"""
<div class="card {card_cls}">
  <div class="pts">{ch['points']} pts</div>
  <h3>{escape(ch['name'])}</h3>
  <p>{escape(ch['desc'])}</p>
  {solved_tag}
  <div class="link-row">{links}</div>
</div>""")

        # Progress bar for locked next tier
        prog = ""
        if not unlocked and tier > 0:
            pct = int(prev_count / max(threshold,1) * 100)
            prog = f"""
<div style="margin-bottom:10px;font-size:12px;color:#556677">
  Progress to unlock: {prev_count}/{threshold} T{tier-1} solves
  <div class="progress"><div class="progress-fill" style="width:{pct}%"></div></div>
</div>"""

        lock_msg = "" if unlocked else """
<div class="lock-msg">
  <strong>LOCKED</strong> — Complete enough challenges in the previous tier to unlock this one.
</div>"""

        sections.append(f"""
<div class="tier-block">
  <div class="tier-header">
    <span style="color:#8899aa;font-size:13px">{tier_names[tier]}</span>
    <span class="tier-badge {badge_cls}">{badge_txt}</span>
  </div>
  {prog}{lock_msg}
  <div class="challenge-grid">{''.join(cards)}</div>
</div>""")

    # Flag submit bar
    submit_bar = """
<div style="background:#0d1520;border:1px solid #1e2a38;padding:14px 16px;border-radius:4px;margin-bottom:24px;display:flex;align-items:center;gap:16px">
  <span style="color:#8899aa;font-size:12px;white-space:nowrap">SUBMIT FLAG:</span>
  <form class="submit-form" method="GET" action="/" style="flex:1">
    <input name="flag" placeholder="FLAG{...}" autocomplete="off">
    <button class="btn btn-green" type="submit">Submit</button>
  </form>
  <span style="color:#5eb8ff;font-size:13px;white-space:nowrap">Score: <strong>{}</strong></span>
</div>""".format(team["score"])

    body = submit_bar + "\n".join(sections)
    return render(body, flashes, team)

@app.route("/file/<path:filepath>")
@login_required
def serve_file(filepath):
    """Serve challenge files with tier gate."""
    team = get_team()

    # Find which challenge owns this file
    owning_tier = None
    for tier, chs in CHALLENGES.items():
        for ch in chs:
            if ch.get("file") == filepath:
                owning_tier = tier
                break
        if owning_tier is not None:
            break

    if owning_tier is None:
        abort(404)

    if not tier_unlocked(team["id"], owning_tier):
        abort(403)

    # Sanitise path — no traversal
    safe = os.path.normpath(filepath)
    if safe.startswith("..") or safe.startswith("/"):
        abort(403)

    full_path = os.path.join(FILES_ROOT, safe)
    if not os.path.isfile(full_path):
        abort(404)

    return send_file(full_path, as_attachment=True)

@app.route("/scoreboard")
def scoreboard():
    team = get_team()
    rows = get_db().execute("""
        SELECT t.name, t.score,
               (SELECT COUNT(*) FROM solves s WHERE s.team_id=t.id) as solved,
               t.created
        FROM teams t
        ORDER BY t.score DESC, t.created ASC
        LIMIT 50
    """).fetchall()

    rows_html = ""
    for i, r in enumerate(rows, 1):
        rank_cls = {1:"rank1",2:"rank2",3:"rank3"}.get(i,"")
        medal    = {1:"🥇",2:"🥈",3:"🥉"}.get(i, str(i))
        rows_html += f"""<tr>
          <td class="{rank_cls}">{medal}</td>
          <td class="{rank_cls}">{escape(r['name'])}</td>
          <td style="color:#5eb8ff">{r['score']}</td>
          <td>{r['solved']}</td>
          <td style="color:#556677">{r['created'][:16]}</td>
        </tr>"""

    body = f"""
<h2 style="color:#5eb8ff;margin-bottom:18px;font-size:15px">SCOREBOARD</h2>
<table>
  <tr>
    <th>#</th><th>Team</th><th>Score</th><th>Solves</th><th>Registered</th>
  </tr>
  {rows_html}
</table>"""
    return render(body, team=team)

# ── Startup ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=False)
