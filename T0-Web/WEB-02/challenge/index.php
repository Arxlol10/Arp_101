<?php
require_once 'config.php';

// VULNERABILITY: Local File Inclusion via unsanitized page parameter
$page = isset($_GET['page']) ? $_GET['page'] : 'home';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= APP_NAME ?> - Internal Portal</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <nav class="sidebar">
        <div class="sidebar-header">
            <span class="sidebar-logo">🏢</span>
            <h2><?= APP_NAME ?></h2>
            <span class="version">v<?= APP_VERSION ?></span>
        </div>
        <ul class="nav-links">
            <li><a href="?page=home" class="<?= $page === 'home' ? 'active' : '' ?>">🏠 Home</a></li>
            <li><a href="?page=about" class="<?= $page === 'about' ? 'active' : '' ?>">ℹ️ About</a></li>
            <li><a href="?page=contact" class="<?= $page === 'contact' ? 'active' : '' ?>">📧 Contact</a></li>
            <li><a href="?page=team" class="<?= $page === 'team' ? 'active' : '' ?>">👥 Team</a></li>
            <li><a href="?page=docs" class="<?= $page === 'docs' ? 'active' : '' ?>">📄 Documents</a></li>
        </ul>
        <div class="sidebar-footer">
            <p>Logged in as: <strong>guest</strong></p>
        </div>
    </nav>

    <main class="content">
        <div class="content-header">
            <h1><?= ucfirst(htmlspecialchars($page)) ?></h1>
            <span class="breadcrumb"><?= APP_NAME ?> / <?= ucfirst(htmlspecialchars($page)) ?></span>
        </div>
        <div class="content-body">
            <?php
            // VULNERABLE: Direct inclusion of user input
            // Appends .php extension, but this can be bypassed with:
            //   - php://filter wrappers
            //   - null byte injection (PHP < 5.3)
            //   - path truncation
            $filepath = "pages/" . $page . ".php";
            
            if (strpos($page, '://') !== false || strpos($page, '..') !== false) {
                // "Security" filter - easily bypassed with php://filter
                // The developer forgot that php://filter is a valid wrapper
                if (strpos($page, 'php://filter') !== false) {
                    // Oops, this passes through!
                    @include($page . '.php');
                } else {
                    @include($page);
                }
            } elseif (file_exists($filepath)) {
                include($filepath);
            } else {
                echo '<div class="error-box">';
                echo '<h2>⚠️ Page Not Found</h2>';
                echo '<p>The page "' . htmlspecialchars($page) . '" could not be found.</p>';
                echo '<p>Available pages: home, about, contact, team, docs</p>';
                echo '</div>';
            }
            ?>
        </div>
    </main>
</body>
</html>
