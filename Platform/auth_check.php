<?php
// Called by nginx auth_request before serving /files/
// T1 files → require t1_unlocked
// T2 files → require t2_unlocked
session_start();

$uri = $_SERVER['REQUEST_URI'] ?? '';

// T2-specific files — require t2_unlocked
$t2_patterns = [
    'encrypted_bash_history',
    'analyst_note',
    'analyst_db',
    'dmesg.log',
    'license_validator',
];

$is_t2 = false;
foreach ($t2_patterns as $pattern) {
    if (strpos($uri, $pattern) !== false) {
        $is_t2 = true;
        break;
    }
}

if ($is_t2) {
    http_response_code(!empty($_SESSION['t2_unlocked']) ? 200 : 403);
} else {
    http_response_code(!empty($_SESSION['t1_unlocked']) ? 200 : 403);
}
