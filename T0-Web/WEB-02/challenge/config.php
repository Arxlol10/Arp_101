<?php
// Challenge: WEB-02 - ImageTragick RCE
define('FLAG', 'FLAG{web_02_imagetragick_rce_p9n7}');
define('FLAG_PATH', '/var/www/flags/web02/flag.txt');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_MIMES', ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/x-ms-bmp']);
define('APP_NAME', 'ThumbnailGen');
define('APP_VERSION', '1.2.0');
