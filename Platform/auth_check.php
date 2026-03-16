<?php
// Called by nginx auth_request before serving /files/
// Returns 200 if session has t1_unlocked, 403 otherwise
session_start();
if (!empty($_SESSION['t1_unlocked'])) {
    http_response_code(200);
} else {
    http_response_code(403);
}
