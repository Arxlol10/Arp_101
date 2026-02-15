<?php
// Challenge: WEB-03 - JWT Secret Leak
define('FLAG', 'FLAG{web_03_jwt_secret_leak_q2w8}');
define('FLAG_PATH', '/var/www/flags/web03/flag.txt');
define('JWT_SECRET', 's3cr3t_k3y_d0nt_l34k');  // Leaked in auth.min.js
define('APP_NAME', 'CorpPortal');
define('APP_VERSION', '4.1.0');
define('ADMIN_USER', 'admin');
define('ADMIN_PASS_HASH', '$2y$10$YlRZ0bPXkzKjE5wQOcyMaO5Sl.ZK8KjSGVFfG7hLnbG1xVbSqUJi2'); // admin123
