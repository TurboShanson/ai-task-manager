# ai-task-manager

## Создание БД
jsonwebtoken bcryptjs
express cors
--save-dev nodemon
dotenv


### Бэк:
cd backend
npm run dev
Поднимется Express-сервер (nodemon перезапускает при изменениях), должен быть запущен PostgreSQL

### Фронт:
cd frontend
npm run dev
Поднимется Vite dev-сервер

### AI-сервис:
cd analysis-service
python -m venv venv
venv\Scripts\activate   (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
Поднимется сервис на http://localhost:8000, эндпоинт POST /analyze принимает { "title": "...", "description": "..." } и возвращает { "priority": "...", "category": "..." }