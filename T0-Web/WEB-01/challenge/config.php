<?php
// Challenge: WEB-01 - Polyglot Upload
define('FLAG', 'FLAG{web_01_polyglot_upload_bypass_k8m3}');
define('FLAG_PATH', '/var/www/flags/web01/flag.txt');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('MAX_FILE_SIZE', 2 * 1024 * 1024); // 2MB
define('ALLOWED_MIMES', ['image/png', 'image/jpeg', 'image/gif']);
define('BLOCKED_EXTENSIONS', ['php', 'php3', 'php4', 'php5', 'phtml']);
// NOTE: .pht is NOT blocked (intentional vulnerability)
