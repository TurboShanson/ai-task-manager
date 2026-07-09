from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from category import detect_category, warmup
from priority import detect_priority, strip_schedule_words


@asynccontextmanager
async def lifespan(_: FastAPI):
    # прогреваем модель до приёма запросов, чтобы первый /analyze
    # не упирался в её загрузку (и в 3-секундный таймаут backend'а)
    warmup()
    yield


app = FastAPI(title="Task Analysis Service", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


class AnalyzeRequest(BaseModel):
    title: str
    description: str | None = None


class AnalyzeResponse(BaseModel):
    priority: str
    category: str
    confidence: float


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    text = f"{payload.title} {payload.description or ''}".strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст задачи пустой")

    try:
        # даты и слова срочности — сигнал для приоритета, но шум для категории
        category, confidence = detect_category(strip_schedule_words(text))
        return AnalyzeResponse(
            priority=detect_priority(text),
            category=category,
            confidence=confidence,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Ошибка анализа текста: {exc}") from exc
