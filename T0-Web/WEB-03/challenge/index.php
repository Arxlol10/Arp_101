<?php
require_once 'config.php';

// Handle login API
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['REQUEST_URI'], '/api/login') !== false) {
    header('Content-Type: application/json');
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || empty($input['username']) || empty($input['password'])) {
        echo json_encode(['error' => 'Username and password required']);
        exit;
    }
    
    // Only the admin account exists (but password is not guessable)
    if ($input['username'] === 'admin' && password_verify($input['password'], ADMIN_PASS_HASH)) {
        // Generate real JWT (players shouldn't reach this — the password isn't crackable)
        $header = rtrim(str_replace(['+', '/'], ['-', '_'], base64_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']))), '=');
        $payload = rtrim(str_replace(['+', '/'], ['-', '_'], base64_encode(json_encode([
            'sub' => 'admin',
            'role' => 'admin',
            'iss' => 'corpportal',
            'iat' => time(),
            'exp' => time() + 3600,
        ]))), '=');
        $sig = rtrim(str_replace(['+', '/'], ['-', '_'], base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true))), '=');
        
        echo json_encode(['token' => "$header.$payload.$sig"]);
    } else {
        echo json_encode(['error' => 'Invalid credentials']);
    }
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= APP_NAME ?> — Corporate Portal</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="js/config.bundle.js" defer></script>
    <script src="js/analytics.min.js" defer></script>
    <script src="js/auth.min.js" defer></script>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">
                <span class="logo-icon">🏢</span>
                <h1><?= APP_NAME ?></h1>
            </div>
            <p class="subtitle">Internal Corporate Portal — Authorized Personnel Only</p>
            <span class="version">v<?= APP_VERSION ?></span>
        </header>

        <div class="login-section">
            <h2>🔐 Employee Login</h2>
            <p class="info">Enter your corporate credentials to access internal resources.</p>
            
            <div id="login-error" class="alert alert-error" style="display: none;"></div>
            
            <form class="login-form" onsubmit="event.preventDefault(); CorpAuth.login(document.getElementById('username').value, document.getElementById('password').value);">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" placeholder="employee_id" required autocomplete="off">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="••••••••" required>
                </div>
                <button type="submit" class="btn-login">Sign In</button>
            </form>
            
            <div class="login-footer">
                <p>Having trouble? Contact <a href="#">IT Support</a></p>
            </div>
        </div>

        <div class="info-section">
            <h2>📋 Portal Features</h2>
            <div class="feature-grid">
                <div class="feature-card">
                    <span class="feature-icon">📊</span>
                    <h3>Dashboard</h3>
                    <p>View company metrics and KPIs</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">👥</span>
                    <h3>Directory</h3>
                    <p>Employee directory and contacts</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">⚙️</span>
                    <h3>Admin Panel</h3>
                    <p>System administration (restricted)</p>
                    <span class="badge">Admin Only</span>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">📄</span>
                    <h3>Documents</h3>
                    <p>Internal documents and policies</p>
                </div>
            </div>
        </div>

        <footer>
            <p><?= APP_NAME ?> v<?= APP_VERSION ?> &copy; 2024 — Corporate Internal Platform</p>
            <p class="footer-note">Powered by CorpPortal | For authorized use only</p>
        </footer>
    </div>
</body>
</html>
