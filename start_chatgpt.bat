@echo off
title ChatGPT Pro - Hosted Multi-User AI Platform
echo ========================================================
echo   Launching ChatGPT Pro (Project Phase 3)
echo   Backend: FastAPI (Port 8000)
echo   Frontend: Next.js + React + TypeScript (Port 3000)
echo ========================================================

cd /d "%~dp0backend"
start "ChatGPT Backend API" cmd /k "python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

cd /d "%~dp0frontend"
start "ChatGPT Next.js UI" cmd /k "npm run start"

echo.
echo Both servers launched!
echo Access the ChatGPT UI at: http://localhost:3000
echo Backend API Swagger Docs at: http://localhost:8000/docs
echo.
pause

