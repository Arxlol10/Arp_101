<?php
/**
 * Challenge: WEB-02 - ImageTragick RCE
 * Vulnerability: ImageMagick CVE-2016-3714 (ImageTragick)
 *   - SVG/MVG files processed by `convert` can execute arbitrary commands
 *   - Weak policy.xml allows dangerous delegates
 */

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: index.php');
    exit;
}

if (!isset($_FILES['image'])) {
    die('No file uploaded');
}

$file = $_FILES['image'];
$filename = $file['name'];
$tmpname = $file['tmp_name'];
$size = $file['size'];

// Validation: File size
if ($size > MAX_FILE_SIZE) {
    header("Location: index.php?error=" . urlencode("File too large. Maximum 10MB."));
    exit;
}

// Validation: MIME type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $tmpname);
finfo_close($finfo);

if (!in_array($mime, ALLOWED_MIMES)) {
    header("Location: index.php?error=" . urlencode("Invalid file type. Supported: PNG, JPG, GIF, SVG, BMP."));
    exit;
}

// Sanitize filename
$safe_name = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
$upload_id = uniqid('img_');
$ext = strtolower(pathinfo($safe_name, PATHINFO_EXTENSION));
$saved_name = $upload_id . '.' . $ext;

// Save uploaded file
$destination = UPLOAD_DIR . $saved_name;
if (!move_uploaded_file($tmpname, $destination)) {
    header("Location: index.php?error=" . urlencode("Upload failed."));
    exit;
}

// VULNERABILITY: Generate thumbnail using ImageMagick convert
// ImageTragick (CVE-2016-3714) allows command injection via crafted SVG/MVG files
$thumbnail_name = 'thumb_' . $saved_name;
$thumbnail_path = UPLOAD_DIR . $thumbnail_name;

// Uses safe_convert wrapper to restrict execution scope
$cmd = "/usr/local/bin/safe_convert " . escapeshellarg($destination) . " " . escapeshellarg($thumbnail_path) . " 2>&1";
$output = [];
exec($cmd, $output, $return_code);

$result = [
    'original' => $saved_name,
    'thumbnail' => ($return_code === 0) ? $thumbnail_name : null,
    'size' => $size,
    'type' => $mime,
    'convert_output' => implode("\n", $output),
];

header("Location: index.php?success=" . urlencode("Image uploaded and thumbnail generated!") . "&file=" . urlencode($saved_name));
exit;
?>
