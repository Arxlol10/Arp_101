<?php
/**
 * Challenge: WEB-01 - Polyglot Upload
 * Vulnerabilities:
 *   1. .pht extension bypass (not in blocked list)
 *   2. Predictable upload path (MD5 of timestamp+IP)
 *   3. Polyglot files pass MIME + magic byte validation
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

if (!isset($_FILES['profile_pic'])) {
    die('No file uploaded');
}

$file = $_FILES['profile_pic'];
$filename = $file['name'];
$tmpname = $file['tmp_name'];
$size = $file['size'];
$errors = [];

// Validation 1: File size
if ($size > MAX_FILE_SIZE) {
    $errors[] = 'File too large. Maximum 2MB allowed.';
}

// Validation 2: MIME type check via finfo (bypassed by polyglot)
if (empty($errors)) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $tmpname);
    finfo_close($finfo);

    if (!in_array($mime, ALLOWED_MIMES)) {
        $errors[] = 'Invalid file type. Only PNG, JPG, GIF allowed.';
    }
}

// Validation 3: Magic bytes check (also bypassed by polyglot)
if (empty($errors)) {
    $handle = fopen($tmpname, 'rb');
    $magic = fread($handle, 4);
    fclose($handle);

    // PNG: 89 50 4E 47, JPEG: FF D8 FF, GIF: 47 49 46
    $valid_magic = false;
    if (substr($magic, 0, 4) === "\x89\x50\x4E\x47") $valid_magic = true;
    if (substr($magic, 0, 3) === "\xFF\xD8\xFF") $valid_magic = true;
    if (substr($magic, 0, 3) === "GIF") $valid_magic = true;

    if (!$valid_magic) {
        $errors[] = 'Invalid image file.';
    }
}

// Validation 4: Extension check (VULNERABILITY: .pht is NOT blocked)
if (empty($errors)) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    if (in_array($ext, BLOCKED_EXTENSIONS)) {
        $errors[] = 'PHP files are not allowed.';
    }
}

// Handle errors
if (!empty($errors)) {
    $errorMsg = implode(' ', $errors);
    header("Location: index.php?error=" . urlencode($errorMsg));
    exit;
}

// Generate predictable upload path (VULNERABILITY)
$timestamp = time();
$client_ip = $_SERVER['REMOTE_ADDR'];
$hash = md5($timestamp . $client_ip);
$upload_dir = substr($hash, 0, 8);

// Create upload directory
$upload_path = UPLOAD_DIR . $upload_dir . "/";
if (!is_dir($upload_path)) {
    mkdir($upload_path, 0755, true);
}

// Save file with original filename
$destination = $upload_path . basename($filename);

if (move_uploaded_file($tmpname, $destination)) {
    // Leak timestamp in response header (helps players predict path)
    header('X-Upload-Time: ' . $timestamp);
    $successMsg = "File uploaded successfully!";
    header("Location: index.php?success=" . urlencode($successMsg));
} else {
    header("Location: index.php?error=" . urlencode("Upload failed."));
}
exit;
?>
