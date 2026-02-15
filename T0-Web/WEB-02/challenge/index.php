<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= APP_NAME ?> — Image Thumbnail Generator</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">
                <span class="logo-icon">🖼️</span>
                <h1><?= APP_NAME ?></h1>
            </div>
            <p class="subtitle">Upload an image and we'll generate a thumbnail for you</p>
            <span class="version">v<?= APP_VERSION ?></span>
        </header>

        <?php if (isset($_GET['error'])): ?>
            <div class="alert alert-error">
                ⚠️ <?= htmlspecialchars($_GET['error']) ?>
            </div>
        <?php endif; ?>

        <?php if (isset($_GET['success'])): ?>
            <div class="alert alert-success">
                ✅ <?= htmlspecialchars($_GET['success']) ?>
            </div>
        <?php endif; ?>

        <div class="upload-section">
            <h2>Upload Image</h2>
            <p class="info">Supported formats: PNG, JPG, GIF, SVG, BMP — Max 10MB</p>
            <!-- Powered by ImageMagick for high-quality thumbnail generation -->
            <form action="upload.php" method="POST" enctype="multipart/form-data" class="upload-form">
                <div class="file-input-wrapper">
                    <input type="file" name="image" id="fileInput" accept="image/*" required>
                    <label for="fileInput" class="file-label">
                        <span class="file-icon">📷</span>
                        <span class="file-text">Choose an image to upload...</span>
                    </label>
                </div>
                <button type="submit" class="btn-upload">Upload & Generate Thumbnail</button>
            </form>
        </div>

        <div class="gallery-section">
            <h2>Generated Thumbnails</h2>
            <?php
            $files = [];
            if (is_dir(UPLOAD_DIR)) {
                $all = array_diff(scandir(UPLOAD_DIR), ['.', '..', '.htaccess', 'index.html']);
                foreach ($all as $f) {
                    if (strpos($f, 'thumb_') === 0) {
                        $original = substr($f, 6); // Remove 'thumb_' prefix
                        $files[] = ['thumb' => $f, 'original' => $original];
                    }
                }
            }
            ?>
            <?php if (empty($files)): ?>
                <p class="empty">No thumbnails generated yet. Upload an image to get started!</p>
            <?php else: ?>
                <div class="file-grid">
                    <?php foreach ($files as $entry): ?>
                        <div class="file-card">
                            <div class="file-preview">
                                <img src="uploads/<?= htmlspecialchars($entry['thumb']) ?>"
                                     alt="thumbnail"
                                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><text y=%2250%22 x=%2220%22 font-size=%2240%22>🖼️</text></svg>'">
                            </div>
                            <span class="file-name"><?= htmlspecialchars($entry['original']) ?></span>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

        <footer>
            <p><?= APP_NAME ?> v<?= APP_VERSION ?> &copy; 2024 — Powered by ImageMagick</p>
            <p class="footer-note">For authorized use only</p>
        </footer>
    </div>

    <script>
        document.getElementById('fileInput').addEventListener('change', function() {
            const label = document.querySelector('.file-text');
            label.textContent = this.files[0] ? this.files[0].name : 'Choose an image to upload...';
        });
    </script>
</body>
</html>
