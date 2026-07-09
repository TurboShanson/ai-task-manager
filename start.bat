@echo off
echo ����� AI Task Manager...

REM Python-�ࢨ� ������� (���� 8000)
start "analysis-service :8000" cmd /k "cd /d %~dp0analysis-service && call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

REM Backend API (���� 5000)
start "backend :5000" cmd /k "cd /d %~dp0backend && npm run dev"

REM Frontend (Vite)
start "frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ��ࢨ�� ����饭� � �⤥���� �����:
echo   - analysis-service: http://localhost:8000 (��⮢�����: GET /health)
echo   - backend:          http://localhost:5000/api
echo   - frontend:         ���� Vite ᬮ�� � ���� frontend (���筮 http://localhost:5173)
echo.
pause
