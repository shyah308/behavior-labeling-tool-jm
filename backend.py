from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
import subprocess
import logging

# 로깅 설정
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_url_path='/Uploads', static_folder='Uploads')
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024 * 1024  # 1GB 최대 파일 크기

# CORS 설정 (로컬 테스트용으로 모든 출처 허용)
CORS(app, resources={r"/process-video": {"origins": "*"}, r"/Uploads/*": {"origins": "*"}})

@app.route('/process-video', methods=['POST'])
def process_video():
    try:
        if 'video' not in request.files:
            logger.error("No video file in request")
            return jsonify({"status": "error", "msg": "No video file uploaded"}), 400
        video = request.files['video']
        if video.filename == '':
            logger.error("Empty filename")
            return jsonify({"status": "error", "msg": "No file selected"}), 400

        session_id = str(uuid.uuid4())
        upload_dir = f"Uploads/{session_id}"
        os.makedirs(upload_dir, exist_ok=True)

        # 원본 파일 저장 대신 임시 파일로 처리
        from tempfile import NamedTemporaryFile
        with NamedTemporaryFile(delete=False, suffix='.tmp') as temp_file:
            video.save(temp_file.name)
            temp_path = temp_file.name

        # MP4로 변환
        converted_path = f"{upload_dir}/converted.mp4"
        result = subprocess.run(
            ['ffmpeg', '-i', temp_path, '-c:v', 'libx264', '-c:a', 'aac', '-strict', '-2', '-y', converted_path],
            check=True, capture_output=True, text=True
        )
        logger.debug(f"FFmpeg output: {result.stdout}")
        if result.stderr:
            logger.error(f"FFmpeg error: {result.stderr}")

        # 임시 파일 삭제
        os.unlink(temp_path)

        # 변환된 파일 URL
        converted_url = f"http://localhost:5000/Uploads/{session_id}/converted.mp4"
        logger.debug(f"Generated converted URL: {converted_url}")
        return jsonify({"status": "ok", "converted_url": converted_url})

    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg processing failed: {e.stderr}")
        return jsonify({"status": "error", "msg": f"FFmpeg 오류: {e.stderr}"}), 500
    except FileNotFoundError:
        logger.error("FFmpeg not found in system PATH")
        return jsonify({"status": "error", "msg": "FFmpeg가 설치되지 않았거나 PATH에 없습니다. 설치 후 PATH에 추가해주세요."}), 500
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"status": "error", "msg": str(e)}), 500

@app.route('/Uploads/<path:path>')
def serve_file(path):
    logger.debug(f"Serving file from path: {path}")
    return send_from_directory('Uploads', path)

if __name__ == '__main__':
    os.makedirs("Uploads", exist_ok=True)
    app.run(host='0.0.0.0', port=5000)