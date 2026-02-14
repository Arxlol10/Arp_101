<?php
/**
 * Internal Admin API — NOT exposed to the internet
 * Runs on localhost:8080
 * Contains sensitive flag data
 */

$request_uri = $_SERVER['REQUEST_URI'] ?? '/';

header('Content-Type: application/json');

if (strpos($request_uri, '/flag') !== false) {
    echo json_encode([
        'status' => 'success',
        'service' => 'Internal Admin API',
        'flag' => 'FLAG{web_03_ssrf_internal_d8v5}',
        'message' => 'Congratulations! You reached the internal service via SSRF.',
    ], JSON_PRETTY_PRINT);
} elseif (strpos($request_uri, '/status') !== false) {
    echo json_encode([
        'status' => 'ok',
        'uptime' => '47d 12h 33m',
        'services' => ['mysql' => 'running', 'redis' => 'running', 'nginx' => 'running'],
    ], JSON_PRETTY_PRINT);
} elseif (strpos($request_uri, '/admin') !== false) {
    echo json_encode([
        'status' => 'success',
        'panel' => 'Internal Admin Panel',
        'endpoints' => ['/flag', '/status', '/admin', '/users'],
        'hint' => 'Try /flag for sensitive data',
    ], JSON_PRETTY_PRINT);
} else {
    echo json_encode([
        'status' => 'ok',
        'service' => 'Internal API v2.1',
        'endpoints' => ['/admin', '/status'],
        'warning' => 'This service should not be accessible from outside.',
    ], JSON_PRETTY_PRINT);
}
