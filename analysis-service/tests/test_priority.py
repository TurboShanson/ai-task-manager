from datetime import datetime

import pytest

import priority
from priority import detect_priority, strip_schedule_words


class _FrozenDateTime(datetime):
    @classmethod
    def now(cls, tz=None):
        return cls(2026, 7, 7)  # вторник


@pytest.fixture(autouse=True)
def _frozen_now(monkeypatch):
    monkeypatch.setattr(priority, "datetime", _FrozenDateTime)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        # срочность
        ("Срочно подготовить отчёт", "high"),
        ("Задача ASAP", "high"),
        ("Это критично для релиза", "high"),
        # отрицания и явный низкий приоритет
        ("Это не срочно, сделать когда-нибудь", "low"),
        ("не срочно", "low"),
        ("несрочная задача", "low"),
        ("отложить на потом", "low"),
        ("это не к спеху", "low"),
        ("задача с низким приоритетом", "low"),
        # ближайшие дни
        ("Купить продукты завтра", "high"),
        ("сделать сегодня", "high"),
        ("подготовить к послезавтра", "high"),
        # ложные срабатывания по подстрокам
        ("позавтракать с командой", "medium"),
        ("средний отчёт по продажам", "medium"),
        # дни недели (сегодня вторник 2026-07-07)
        ("встреча в среду", "high"),
        ("сдать отчёт в пятницу", "medium"),
        ("созвон в субботу", "medium"),
        # числовые даты
        ("оплатить счёт 09.07", "high"),
        ("оплатить счёт 10.07", "medium"),
        ("сдать проект 15.07.2026", "medium"),
        ("обновить версию 1.5", "medium"),
        # словесные даты
        ("сдать отчёт до 15 июля", "medium"),
        ("сделать через неделю", "medium"),
        # числа и время — не дедлайны
        ("сделать 5 задач", "medium"),
        ("встреча в 5", "medium"),
        # без сигналов
        ("обычная задача без сроков", "medium"),
    ],
)
def test_detect_priority(text, expected):
    assert detect_priority(text) == expected


def test_past_numeric_date_rolls_to_next_year():
    # 05.07 уже прошло — трактуется как следующий год, дедлайн далеко
    assert detect_priority("сдать отчёт 05.07") == "medium"


def test_strip_removes_worded_date():
    assert strip_schedule_words("Пройти курс по SQL до 15 июля") == "Пройти курс по SQL"


def test_strip_removes_numeric_date_and_urgency():
    assert strip_schedule_words("Срочно оплатить счёт 09.07") == "оплатить счёт"


def test_strip_removes_negated_urgency_entirely():
    assert strip_schedule_words("Убраться дома, не срочно") == "Убраться дома,"


def test_strip_preserves_case():
    assert strip_schedule_words("Пройти туториал по FastAPI завтра") == "Пройти туториал по FastAPI"


def test_strip_keeps_text_without_schedule_words():
    assert strip_schedule_words("Подготовить слайды для инвесторов") == "Подготовить слайды для инвесторов"
