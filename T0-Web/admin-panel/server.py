from flask import Flask, request, jsonify, send_file, render_template_string
import os

app = Flask(__name__)

# Serve the static files from the current directory
@app.route('/')
def serve_index():
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            content = f.read()
        return render_template_string(content)
    except Exception as e:
        return f"Error loading index.html: {e}", 500

@app.route('/style.css')
def serve_css():
    try:
        return send_file('style.css', mimetype='text/css')
    except Exception as e:
        return f"Error loading style.css: {e}", 404

# The vulnerable endpoint (Local File Inclusion / Directory Traversal)
@app.route('/api/v1/debug/logs', methods=['GET'])
def get_debug_logs():
    # Intentionally vulnerable to path traversal
    # Example: ?file=../../../../../../etc/passwd
    file_path = request.args.get('file')
    
    if not file_path:
        return jsonify({"error": "Missing 'file' parameter"}), 400
        
    try:
        # No sanitization - direct read
        # In a real CTF scenario, they might read /etc/passwd to find users
        # or read application config files to find secrets.
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        return content, 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        # Don't leak the exact path error to make it slightly more challenging,
        # but returning 500 indicates the file doesn't exist or permissions error.
        return jsonify({"error": "Failed to read log file."}), 500

if __name__ == '__main__':
    # Run on all interfaces on port 8080 by default
    print("NexusCorp SIEM Dashboard running on http://0.0.0.0:8080")
    print("Vulnerability active on: /api/v1/debug/logs?file=<path>")
    app.run(host='0.0.0.0', port=8080)
