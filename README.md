# Behavior Labeling Tool
비디오를 업로드하고 행동을 라벨링하여 CSV로 내보는 도구입니다.

## 요구사항
- Python 3.7+: https://www.python.org/downloads/
- Node.js 18+: https://nodejs.org/
- FFmpeg: https://www.gyan.dev/ffmpeg/builds/ , 설치 후 `bin` 폴더를 환경 변수 PATH에 추가
- Git: https://git-scm.com/download/win

## 설치
1. git clone https://github.com/shyah308/behavior-labeling-tool-jm.git
2. cd behavior_labeling_tool
3. pip install -r requirements.txt
4. cd frontend
5. npm install

## 실행 (다른 터미널로 실행)
- 백엔드:
    python backend.py
- 프론트엔드:
    cd frontend
    npm start

브라우저에서 http://localhost:3000에 접속.
비디오 파일을 업로드하고 행동을 라벨링.
라벨링된 데이터를 CSV로 내보내기.
