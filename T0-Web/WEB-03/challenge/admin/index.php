<?php
require_once __DIR__ . '/../config.php';

/**
 * JWT-protected admin panel
 * Players must forge a valid JWT with admin role using the leaked secret
 */

// Simple JWT decode/verify (no external libraries)
function base64url_decode($data) {
    return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
}

function verify_jwt($token, $secret) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;

    $header = json_decode(base64url_decode($parts[0]), true);
    $payload = json_decode(base64url_decode($parts[1]), true);

    if (!$header || !$payload) return false;
    if (($header['alg'] ?? '') !== 'HS256') return false;

    // Verify signature
    $signature_input = $parts[0] . '.' . $parts[1];
    $expected_sig = rtrim(str_replace(['+', '/'], ['-', '_'], base64_encode(
        hash_hmac('sha256', $signature_input, $secret, true)
    )), '=');

    if (!hash_equals($expected_sig, $parts[2])) return false;

    // Check expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) return false;

    return $payload;
}

// Check for JWT in cookie or Authorization header
$token = $_COOKIE['auth_token'] ?? null;
if (!$token) {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/', $auth_header, $m)) {
        $token = $m[1];
    }
}

$user = null;
if ($token) {
    $user = verify_jwt($token, JWT_SECRET);
}

// Require admin role
if (!$user || ($user['role'] ?? '') !== 'admin') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Access denied. Admin authentication required.',
        'hint' => 'Provide a valid JWT with admin role via auth_token cookie or Authorization: Bearer header',
    ], JSON_PRETTY_PRINT);
    exit;
}

// Admin access granted — return flag
header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'Welcome, Administrator!',
    'flag' => FLAG,
    'admin_panel' => [
        'users' => 47,
        'active_sessions' => 12,
        'system_health' => 'OK',
    ],
], JSON_PRETTY_PRINT);
