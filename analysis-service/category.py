from sentence_transformers import SentenceTransformer, util

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

# «general» — это fallback, а не категория с эталонами: туда попадает всё,
# что не набрало порог или не оторвалось от второго места
CATEGORY_PROTOTYPES = {
    "business": [
        "подготовить презентацию для клиента",
        "деловая встреча с партнёрами",
        "отчёт для руководства",
        "переговоры с поставщиком",
        "созвон с заказчиком по проекту",
        "составить коммерческое предложение",
        "выставить счёт клиенту",
        "подписать договор с подрядчиком",
        "собеседование с кандидатом",
        "планёрка с командой",
        "подготовить квартальный отчёт по продажам",
        "согласовать бюджет проекта",
        "провести совещание по проекту",
        "обсудить условия контракта",
        "организовать командировку",
        "подготовить документы для налоговой",
        "подписать акт выполненных работ у заказчика",
        "оформить закрывающие документы по сделке",
    ],
    "study": [
        "изучить новую тему",
        "пройти онлайн-курс",
        "прочитать документацию",
        "сделать домашнее задание",
        "подготовиться к экзамену",
        "повторить конспект лекции",
        "решить задачи по математике",
        "написать курсовую работу",
        "выучить новые английские слова",
        "посмотреть обучающее видео",
        "разобраться с новым фреймворком",
        "записаться на вебинар",
        "подготовиться к контрольной работе",
        "прочитать главу учебника",
        "закончить курс по программированию",
        "сделать конспект по истории",
        "порешать задачи по программированию",
        "разобраться в новой технологии",
        "изучить как работает инструмент",
    ],
    "personal": [
        "купить продукты",
        "записаться к врачу",
        "убраться дома",
        "заняться спортом",
        "сходить в спортзал",
        "приготовить ужин",
        "постирать одежду",
        "оплатить коммунальные услуги",
        "забрать посылку с почты",
        "позвонить родителям",
        "сходить к стоматологу",
        "погулять с собакой",
        "купить подарок на день рождения",
        "сходить за продуктами на неделю",
        "записаться на приём к терапевту",
        "навести порядок в квартире",
        "сходить в парикмахерскую",
        "записаться на маникюр в салон",
    ],
}

CATEGORY_THRESHOLD = 0.32
CATEGORY_MARGIN = 0.05
TOP_K = 3

_model = None
_category_embeddings = None


def warmup() -> None:
    # модель грузится лениво: тестам решающей логики она не нужна,
    # а сервис прогревает её при старте (lifespan в main.py)
    global _model, _category_embeddings
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
        _category_embeddings = {
            category: _model.encode(phrases, convert_to_tensor=True)
            for category, phrases in CATEGORY_PROTOTYPES.items()
        }


def category_scores(text: str) -> dict[str, float]:
    warmup()
    embedding = _model.encode(text, convert_to_tensor=True)
    scores = {}
    for category, proto_embeddings in _category_embeddings.items():
        similarities = util.cos_sim(embedding, proto_embeddings)[0]
        top_k = min(TOP_K, similarities.shape[0])
        scores[category] = similarities.topk(top_k).values.mean().item()
    return scores


def resolve_category(scores: dict[str, float]) -> tuple[str, float]:
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    best_category, best_score = ranked[0]
    second_score = ranked[1][1]

    if best_score < CATEGORY_THRESHOLD or best_score - second_score < CATEGORY_MARGIN:
        return "general", round(best_score, 3)

    return best_category, round(best_score, 3)


def detect_category(text: str) -> tuple[str, float]:
    # для одного слова эмбеддинг-сходства шумят — контекста нет
    if not text or len(text.split()) < 2:
        return "general", 0.0

    return resolve_category(category_scores(text))
