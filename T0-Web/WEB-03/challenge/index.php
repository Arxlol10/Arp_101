<?php
require_once 'config.php';

$result = null;
$error = null;
$url = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['url'])) {
    $url = trim($_POST['url']);
    
    // Parse URL
    $parsed = parse_url($url);
    $scheme = strtolower($parsed['scheme'] ?? 'http');
    $host = strtolower($parsed['host'] ?? '');
    
    // VULNERABILITY: Weak blacklist-based SSRF filter
    // Only blocks exact matches of '127.0.0.1', 'localhost', etc.
    // Bypasses: 0.0.0.0, [::1], 0x7f000001, 2130706433, localtest.me
    
    if (in_array($scheme, BLOCKED_SCHEMES)) {
        $error = "Error: Protocol '$scheme' is not allowed.";
    } elseif (in_array($host, BLOCKED_HOSTS)) {
        $error = "Error: Access to internal hosts is restricted.";
    } elseif (empty($host)) {
        $error = "Error: Invalid URL format.";
    } else {
        // Fetch the URL
        $context = stream_context_create([
            'http' => [
                'timeout' => 5,
                'follow_location' => true,
                'max_redirects' => 3,
                'user_agent' => 'LinkPeek/1.4.2 URL Preview Bot',
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ]
        ]);
        
        $content = @file_get_contents($url, false, $context);
        
        if ($content === false) {
            $error = "Error: Could not fetch URL. The host may be unreachable.";
        } else {
            $result = [
                'url' => $url,
                'status' => 'Success',
                'length' => strlen($content),
                'content' => $content,
                'headers' => $http_response_header ?? [],
            ];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= APP_NAME ?> - URL Preview Tool</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">
                <span class="logo-icon">🔗</span>
                <h1><?= APP_NAME ?></h1>
            </div>
            <p class="subtitle">Preview any webpage instantly — paste a URL below</p>
            <span class="version">v<?= APP_VERSION ?></span>
        </header>

        <div class="search-section">
            <form method="POST" class="url-form">
                <div class="input-group">
                    <span class="input-icon">🌐</span>
                    <input type="text" name="url" placeholder="https://example.com" 
                           value="<?= htmlspecialchars($url) ?>" autocomplete="off" required>
                    <button type="submit">Preview</button>
                </div>
            </form>
            <p class="hint">Supports HTTP and HTTPS. Internal hosts are blocked for security.</p>
        </div>

        <?php if ($error): ?>
            <div class="alert alert-error">
                <span class="alert-icon">⚠️</span>
                <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <?php if ($result): ?>
            <div class="result-section">
                <div class="result-header">
                    <h2>Preview Results</h2>
                    <div class="result-meta">
                        <span class="meta-item">📡 <?= htmlspecialchars($result['url']) ?></span>
                        <span class="meta-item">📦 <?= number_format($result['length']) ?> bytes</span>
                    </div>
                </div>
                
                <div class="result-tabs">
                    <button class="tab active" onclick="showTab('rendered')">Rendered</button>
                    <button class="tab" onclick="showTab('source')">Source</button>
                    <button class="tab" onclick="showTab('headers')">Headers</button>
                </div>

                <div id="rendered" class="tab-content active">
                    <div class="preview-frame">
                        <?= $result['content'] ?>
                    </div>
                </div>
                
                <div id="source" class="tab-content">
                    <pre class="source-code"><?= htmlspecialchars($result['content']) ?></pre>
                </div>
                
                <div id="headers" class="tab-content">
                    <pre class="source-code"><?php 
                        foreach ($result['headers'] as $h) {
                            echo htmlspecialchars($h) . "\n";
                        }
                    ?></pre>
                </div>
            </div>
        <?php endif; ?>

        <footer>
            <p><?= APP_NAME ?> v<?= APP_VERSION ?> &copy; 2024 — URL Preview Service</p>
            <p class="footer-note">Powered by PHP | For authorized use only</p>
        </footer>
    </div>

    <script>
        function showTab(name) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
            document.getElementById(name).classList.add('active');
            event.target.classList.add('active');
        }
    </script>
</body>
</html>
