from priority import detect_priority, strip_schedule_words


# --- Приоритет: слова срочности дают high ---

def test_srochno_is_high():
    assert detect_priority("Срочно подготовить отчёт") == "high"


def test_asap_is_high():
    assert detect_priority("Задача ASAP") == "high"


def test_kritichno_is_high():
    assert detect_priority("Это критично для релиза") == "high"


# --- Приоритет: отрицание срочности и явный низкий приоритет дают low ---

def test_ne_srochno_is_low():
    assert detect_priority("Это не срочно") == "low"


def test_kogda_nibud_is_low():
    assert detect_priority("Сделать когда-нибудь") == "low"


def test_nizkiy_prioritet_is_low():
    assert detect_priority("Задача с низким приоритетом") == "low"


# --- Приоритет: ближайшие дни всегда срочные (не зависят от текущей даты) ---

def test_segodnya_is_high():
    assert detect_priority("Сделать сегодня") == "high"


def test_zavtra_is_high():
    assert detect_priority("Купить продукты завтра") == "high"


# --- Приоритет: нет никаких сигналов — средний по умолчанию ---

def test_no_signals_is_medium():
    assert detect_priority("Обычная задача без сроков") == "medium"


# --- Защита от ложного срабатывания по подстроке ---

def test_pozavtrakat_is_not_zavtra():
    # «позавтракать» содержит «завтра» как часть слова, но это не дедлайн
    assert detect_priority("Позавтракать с командой") == "medium"


# --- strip_schedule_words: убирает даты и срочность, оставляет суть задачи ---

def test_strip_removes_worded_date():
    assert strip_schedule_words("Пройти курс по SQL до 15 июля") == "Пройти курс по SQL"


def test_strip_removes_urgency():
    assert strip_schedule_words("Срочно оплатить счёт") == "оплатить счёт"


def test_strip_keeps_plain_text():
    assert strip_schedule_words("Подготовить слайды для инвесторов") == "Подготовить слайды для инвесторов"
