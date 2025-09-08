from flask import jsonify
# API endpoint to list all .mp4 files in public/best_videos/20250906
@app.route('/api/best_videos')
def list_best_videos():
    video_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../pong-ai-web/public/best_videos/20250906'))
    files = []
    for fname in os.listdir(video_dir):
        if fname.endswith('.mp4'):
            files.append(fname)
    # Sort newest first
    files.sort(reverse=True)
    return jsonify(files)

from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import threading
import time
import os
import shutil

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('stats')
def handle_stats(data):
    # Relay all analytics fields to web clients
    socketio.emit('stats', data)

@app.route('/')
def index():
    return render_template('index.html')


# Background thread: copy new best videos and HTML replays to public folder
def sync_best_videos():
    src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../models/best_videos/20250906'))
    dst_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../pong-ai-web/public/best_videos/20250906'))
    os.makedirs(dst_dir, exist_ok=True)
    while True:
        for fname in os.listdir(src_dir):
            if fname.endswith('.mp4') or fname.endswith('.html'):
                src_path = os.path.join(src_dir, fname)
                dst_path = os.path.join(dst_dir, fname)
                try:
                    # Always copy if source is newer or sizes differ
                    copy_needed = (
                        not os.path.exists(dst_path)
                        or os.path.getmtime(src_path) > os.path.getmtime(dst_path)
                        or os.path.getsize(src_path) != os.path.getsize(dst_path)
                    )
                    if copy_needed:
                        shutil.copy2(src_path, dst_path)
                        # Touch the destination file to update its mtime to now
                        os.utime(dst_path, None)
                        print(f"[Video Sync] Copied and updated: {fname}")
                except Exception as e:
                    print(f"[Video Sync] Error copying {fname}: {e}")
        time.sleep(10)  # Check every 10 seconds

video_sync_thread = threading.Thread(target=sync_best_videos, daemon=True)
video_sync_thread.start()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
