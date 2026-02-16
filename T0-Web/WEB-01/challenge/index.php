<?php require_once 'config.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile Picture Upload</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">
                <span class="logo-icon">🔒</span>
                <h1>SecureShare</h1>
            </div>
            <p class="subtitle">Employee Profile Picture Portal</p>
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
            <h2>Upload Profile Picture</h2>
            <p class="info">Supported: PNG, JPG, GIF — Max 2MB</p>
            <!-- HTML comment hint for observant players -->
            <!-- TODO: migrate to new upload system at /upload_v3/ -->
            <form action="upload.php" method="POST" enctype="multipart/form-data" class="upload-form">
                <div class="file-input-wrapper">
                    <input type="file" name="profile_pic" id="fileInput" accept="image/*" required>
                    <label for="fileInput" class="file-label">
                        <span class="file-icon">📁</span>
                        <span class="file-text">Choose file or drag here...</span>
                    </label>
                </div>
                <button type="submit" class="btn-upload">Upload</button>
            </form>
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
