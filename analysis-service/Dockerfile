# Официальный образ Python 3.11 (минимальная сборка) — основа контейнера
FROM python:3.11-slim

# Рабочая директория внутри контейнера
WORKDIR /app

# Сначала копируем только список зависимостей — так Docker закеширует
# слой с установкой библиотек и не будет пересобирать его при правках кода
COPY requirements.txt .

# Обновляем pip и ставим зависимости из requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Заранее скачиваем модель sentence-transformers в образ, чтобы контейнер
# не тянул её из интернета при каждом запуске и стартовал быстро
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')"

# Копируем исходный код сервиса в /app
COPY . .

# Порт, который слушает сервис внутри контейнера
EXPOSE 8000

# Запуск сервиса при старте контейнера (host 0.0.0.0 — принимать запросы извне)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
