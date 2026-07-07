@echo off
title DocuMind AI - Backend API (http://localhost:8000)
color 0A
echo.
echo  ============================================
echo   DocuMind AI -- Backend API Server
echo   URL:      http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo  ============================================
echo.
cd /d "c:\Users\pilli\OneDrive\Desktop\DocuMind-Ai\backend"
.\venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
