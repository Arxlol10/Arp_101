<?php
require_once 'config.php';

$message = '';
$messageType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
    $file = $_FILES['file'];
    
    // VULNERABILITY: Only checks Content-Type header (client-controlled)
    // Does NOT verify magic bytes or block dangerous extensions
    if (!in_array($file['type'], ALLOWED_TYPES)) {
        $message = 'Error: Only image files (JPEG, PNG, GIF) are allowed.';
        $messageType = 'error';
    } elseif ($file['size'] > MAX_FILE_SIZE) {
        $message = 'Error: File too large. Maximum size is 2MB.';
        $messageType = 'error';
    } elseif ($file['error'] !== UPLOAD_ERR_OK) {
        $message = 'Error: Upload failed. Please try again.';
        $messageType = 'error';
    } else {
        $filename = basename($file['name']);
        $destination = UPLOAD_DIR . $filename;
        
        if (move_uploaded_file($file['tmp_name'], $destination)) {
            $message = "File uploaded successfully: <a href='uploads/$filename'>$filename</a>";
            $messageType = 'success';
        } else {
            $message = 'Error: Failed to save file.';
            $messageType = 'error';
        }
    }
}

// List uploaded files
$files = array_diff(scandir(UPLOAD_DIR), ['.', '..', '.htaccess', 'index.html']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SecureShare - Employee File Portal</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">
                <span class="logo-icon">🔒</span>
                <h1>SecureShare</h1>
            </div>
            <p class="subtitle">Employee Profile Image Portal</p>
        </header>

        <?php if ($message): ?>
            <div class="alert alert-<?= $messageType ?>">
                <?= $message ?>
            </div>
        <?php endif; ?>

        <div class="upload-section">
            <h2>Upload Profile Image</h2>
            <p class="info">Accepted formats: JPEG, PNG, GIF (max 2MB)</p>
            <form method="POST" enctype="multipart/form-data" class="upload-form">
                <div class="file-input-wrapper">
                    <input type="file" name="file" id="fileInput" accept="image/*" required>
                    <label for="fileInput" class="file-label">
                        <span class="file-icon">📁</span>
                        <span class="file-text">Choose file or drag here...</span>
                    </label>
                </div>
                <button type="submit" class="btn-upload">Upload Image</button>
            </form>
        </div>

        <div class="gallery-section">
            <h2>Uploaded Files</h2>
            <?php if (empty($files)): ?>
                <p class="empty">No files uploaded yet.</p>
            <?php else: ?>
                <div class="file-grid">
                    <?php foreach ($files as $f): ?>
                        <div class="file-card">
                            <div class="file-preview">
                                <img src="uploads/<?= htmlspecialchars($f) ?>" alt="<?= htmlspecialchars($f) ?>" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><text y=%2250%22 x=%2220%22 font-size=%2240%22>📄</text></svg>'">
                            </div>
                            <span class="file-name"><?= htmlspecialchars($f) ?></span>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

        <footer>
            <p>SecureShare v2.1.4 &copy; 2024 Corp Internal Tools</p>
        </footer>
    </div>

    <script>
        document.getElementById('fileInput').addEventListener('change', function() {
            const label = document.querySelector('.file-text');
            label.textContent = this.files[0] ? this.files[0].name : 'Choose file or drag here...';
        });
    </script>
</body>
</html>
