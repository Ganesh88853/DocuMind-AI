@echo off
title DocuMind AI - Launcher
color 0E
echo.
echo  ============================================
echo   DocuMind AI -- Starting All Services
echo  ============================================
echo.
echo  [1/2] Starting Backend API on port 8000...
if not exist "c:\Users\pilli\OneDrive\Desktop\DocuMind-Ai\backend\uploads" mkdir "c:\Users\pilli\OneDrive\Desktop\DocuMind-Ai\backend\uploads"
start "DocuMind AI - Backend" cmd /k "cd /d c:\Users\pilli\OneDrive\Desktop\DocuMind-Ai\backend && .\venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo  [2/2] Starting Frontend on port 5173...
start "DocuMind AI - Frontend" cmd /k "cd /d c:\Users\pilli\OneDrive\Desktop\DocuMind-Ai\frontend && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo  ============================================
echo   Both servers are starting up!
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo  ============================================
echo.
echo  Opening browser...
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo  Press any key to close this launcher window.
echo  (The server windows will keep running)
pause >nul
