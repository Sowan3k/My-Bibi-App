@echo off
title My Bibi — Dev Setup

echo.
echo  My Bibi - starting local development environment
echo  ================================================
echo.

REM ── Backend setup ──────────────────────────────────────────────────────────
echo [1/4] Setting up Python virtual environment...
if not exist "backend\venv" (
    python -m venv backend\venv
    echo       Created venv.
) else (
    echo       Venv already exists, skipping.
)

echo [2/4] Installing backend dependencies...
backend\venv\Scripts\pip install -r backend\requirements.txt --quiet
echo       Done.

REM ── Frontend setup ─────────────────────────────────────────────────────────
echo [3/4] Installing frontend dependencies...
cd frontend
call npm install --legacy-peer-deps --silent
cd ..
echo       Done.

REM ── Create .env if missing ──────────────────────────────────────────────────
if not exist ".env" (
    echo [!] No .env found — copying from .env.example.
    echo     IMPORTANT: Edit .env and change JWT_SECRET and INVITE_SECRET before use.
    copy ".env.example" ".env" > nul
)

REM ── Launch servers in separate windows ─────────────────────────────────────
echo [4/4] Launching servers...
echo.
echo  Backend  → http://localhost:8000
echo  Frontend → http://localhost:3000
echo  API docs → http://localhost:8000/docs
echo.

start "My Bibi — Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 2 /nobreak > nul
start "My Bibi — Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo  Two terminal windows opened.
echo  Open http://localhost:3000 in your browser to start.
echo.
pause
