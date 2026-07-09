@echo off
echo Запуск AI Task Manager...

REM Python-сервис анализа (порт 8000)
start "analysis-service :8000" cmd /k "cd /d %~dp0analysis-service && call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

REM Backend API (порт 5000)
start "backend :5000" cmd /k "cd /d %~dp0backend && npm run dev"

REM Frontend (Vite)
start "frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Сервисы запущены в отдельных окнах:
echo   - analysis-service: http://localhost:8000
echo   - backend:          http://localhost:5000/api
echo   - frontend:         адрес Vite смотрите в окне frontend (обычно http://localhost:5173)
echo.
pause
