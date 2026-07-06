from datetime import datetime

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util

app = FastAPI(title="Task Analysis Service")

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
model = SentenceTransformer(MODEL_NAME)

CATEGORY_PROTOTYPES = {
    "business": [
        "подготовить презентацию для клиента",
        "деловая встреча с партнёрами",
        "отчёт для руководства",
        "переговоры с поставщиком",
    ],
    "study": [
        "изучить новую тему",
        "пройти онлайн-курс",
        "прочитать документацию",
        "сделать домашнее задание",
    ],
    "personal": [
        "купить продукты",
        "записаться к врачу",
        "убраться дома",
        "заняться спортом",
    ],
    "general": [
        "сделать задачу",
        "разобраться с делами",
    ],
}
CATEGORY_THRESHOLD = 0.3

_category_embeddings = {
    category: model.encode(phrases, convert_to_tensor=True)
    for category, phrases in CATEGORY_PROTOTYPES.items()
}

URGENT_KEYWORDS = [
    "срочно", "срочный", "немедленно", "asap", "критично", "критически", "горит",
]

WEEKDAY_STEMS = {
    "понедельник": 0,
    "вторник": 1,
    "сред": 2,
    "четверг": 3,
    "пятниц": 4,
    "суббот": 5,
    "воскресень": 6,
}


class AnalyzeRequest(BaseModel):
    title: str
    description: str | None = None


class AnalyzeResponse(BaseModel):
    priority: str
    category: str


def detect_category(text: str) -> str:
    if not text:
        return "general"

    embedding = model.encode(text, convert_to_tensor=True)
    best_category = "general"
    best_score = CATEGORY_THRESHOLD

    for category, proto_embeddings in _category_embeddings.items():
        score = util.cos_sim(embedding, proto_embeddings).max().item()
        if score > best_score:
            best_score = score
            best_category = category

    return best_category


def _days_until_weekday(target_weekday: int) -> int:
    today = datetime.now().weekday()
    delta = (target_weekday - today) % 7
    return delta if delta != 0 else 7


def detect_priority(text: str) -> str:
    lowered = text.lower()

    if any(keyword in lowered for keyword in URGENT_KEYWORDS):
        return "high"

    if "сегодня" in lowered or "завтра" in lowered:
        return "high"

    for stem, weekday in WEEKDAY_STEMS.items():
        if stem in lowered:
            return "high" if _days_until_weekday(weekday) <= 2 else "medium"

    return "medium"


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    text = f"{payload.title} {payload.description or ''}".strip()
    if not text:
        raise HTTPException(status_code=400, detail="Текст задачи пустой")

    try:
        return AnalyzeResponse(
            priority=detect_priority(text),
            category=detect_category(text),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Ошибка анализа текста: {exc}") from exc
