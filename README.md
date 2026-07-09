# AI Task Manager

Менеджер задач с автоматическим AI-анализом текста: при создании задачи её название и описание отправляются в Python-сервис, который определяет **приоритет** (`low` / `medium` / `high`) и **категорию** (`business` / `study` / `personal` / `general`).

Проект состоит из трёх независимых сервисов:

| Сервис | Технологии | Порт |
|---|---|---|
| `backend/` | Node.js, Express, Sequelize, PostgreSQL | 5000 |
| `frontend/` | React 19, Vite, react-router-dom | 5173 |
| `analysis-service/` | Python, FastAPI, sentence-transformers | 8000 |

## Структура проекта

```
ai-task-manager/
├── start.bat                 # запуск всех трёх сервисов в отдельных окнах (Windows)
├── .gitattributes            # правила git для переводов строк и кодировки .bat
│
├── backend/                  # REST API (Node/Express)
│   ├── index.js              # точка входа: создаёт Express-приложение, проверяет
│   │                         #   соединение с PostgreSQL и запускает сервер
│   ├── package.json          # зависимости и npm-скрипты (dev/start)
│   ├── .sequelizerc          # пути Sequelize CLI (config, models, migrations)
│   ├── config/
│   │   └── config.js         # подключение к БД (читает параметры из .env)
│   ├── models/
│   │   ├── index.js          # загрузчик моделей Sequelize
│   │   ├── user.js           # модель User
│   │   └── task.js           # модель Task 
│   ├── migrations/           # миграции
│   │   ├── ...create-users.js
│   │   ├── ...create-tasks.js
│   │   └── ...add-due-date-to-tasks.js
│   ├── routes/
│   │   ├── authRoutes.js     # POST /api/auth/register, POST /api/auth/login
│   │   └── taskRoutes.js     # CRUD /api/tasks (все маршруты под JWT-авторизацией)
│   ├── controllers/
│   │   ├── authController.js # регистрация и вход: bcrypt-хеширование пароля,
│   │   │                     #   выдача JWT-токена
│   │   └── taskController.js # CRUD задач + analyzeTask(): вызов AI-сервиса
│   │                         #   при создании задачи
│   └── middleware/
│       └── authMiddleware.js # проверка заголовка Authorization: Bearer <token>
│
├── frontend/                 # React + Vite
│   ├── index.html            # HTML-каркас
│   ├── vite.config.js        # конфигурация Vite
│   ├── .oxlintrc.json        # конфигурация линтера (oxlint)
│   └── src/
│       ├── main.jsx          # точка входа React
│       ├── App.jsx           # маршрутизация (/login, /register, /tasks)
│       ├── api.js            # адрес backend API (http://localhost:5000/api)
│       ├── index.css         # стили
│       └── pages/
│           ├── LoginPage.jsx    # страница входа
│           ├── RegisterPage.jsx # страница регистрации
│           └── TasksPage.jsx    # основная страница
│
└── analysis-service/         # AI-сервис анализа текста (Python/FastAPI)
    ├── main.py               # FastAPI-приложение
    ├── priority.py           # определение приоритета по правилам: слова срочности,
    │                         #   дни недели, числовые и словесные даты (dateparser);
    │                         #   strip_schedule_words() чистит текст от дат для категоризации
    ├── category.py           # определение категории: эмбеддинги sentence-transformers,
    │                         #   косинусное сходство с эталонными фразами категорий
    ├── requirements.txt      # Python-зависимости
    ├── conftest.py           # конфигурация pytest
    └── tests/
        ├── test_priority.py  # тесты приоритета и очистки текста
        └── test_category.py  # тесты выбора категории
```

## Требования

- Node.js 18+ (с npm)
- Python 3.12+
- PostgreSQL 14+ (запущенный локально)

## Установка

### 1. База данных

Создайте пустую БД в PostgreSQL, например:

```sql
CREATE DATABASE task_manager;
```

### 2. Backend

Создайте файл `backend/.env`:

```env
DB_USERNAME=postgres
DB_PASSWORD=ваш_пароль_от_PostgreSQL
DB_NAME=task_manager
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=любая_длинная_случайная_строка
JWT_EXPIRES_IN=24h
AI_SERVICE_URL=http://localhost:8000
```

Затем:

```bash
cd backend
npm install
npx sequelize-cli db:migrate   # создаёт таблицы users и tasks
```

### 3. Frontend

```bash
cd frontend
npm install
```

### 4. Analysis-service

```bash
cd analysis-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

При первом запуске сервис скачает модель `paraphrase-multilingual-MiniLM-L12-v2` (~500 МБ).

## Запуск

Можно запустить все сервисы разом (Windows): двойной клик по `start.bat` — откроются три окна консоли.

Или вручную, каждый сервис в своём терминале:

```bash
# 1. AI-сервис (порт 8000)
cd analysis-service
venv\Scripts\activate
uvicorn main:app --reload --port 8000
# Для запуска требуется некоторое время.
# Сообщение "Application startup complete." обозначит работоспособность сервиса

# 2. Backend (порт 5000)
cd backend
npm run dev

# 3. Frontend (порт 5173)
cd frontend
npm run dev
```

Приложение: **http://localhost:5173**

## Проверка работоспособности

### Через браузер

1. Откройте http://localhost:5173 — увидите страницу входа.
2. Зарегистрируйтесь, войдите.
3. Создайте задачу, например «Срочно подготовить презентацию для клиента» — сервис автоматически проставит приоритет `high` и категорию `business`.

## Как работает AI-анализ

При `POST /api/tasks` бэкенд отправляет `{title, description}` на `AI_SERVICE_URL/analyze`. Сервис обрабатывает:

1. **Приоритет** (`priority.py`) — правила: слова срочности («срочно», «критично», «asap») → `high`; отрицания («не срочно») и «когда-нибудь / на потом» → `low`; близкий дедлайн (сегодня/завтра, день недели, дата ≤ 2 дней) → `high`, дальний → `medium`.
2. **Категория** (`category.py`) — из текста убираются даты и слова срочности, затем эмбеддинг текста сравнивается по косинусному сходству с эталонными фразами категорий; при низком сходстве или неуверенном отрыве — `general`.

Если AI-сервис недоступен, задача создаётся с `priority=medium`, `category=general` — создание задач не ломается.
