import re
from datetime import date, datetime

from dateparser.search import search_dates

URGENT_PATTERN = re.compile(
    r"\b(?:срочн\w*|немедленно|asap|критичн\w*|критическ\w*|горит)\b", re.IGNORECASE
)

# Проверяется раньше URGENT_PATTERN: «не срочно» содержит «срочно» как подстроку
NEGATED_URGENT_PATTERN = re.compile(
    r"\b(?:не\s+(?:срочн\w*|критичн\w*|горит)|несрочн\w*|некритичн\w*)\b", re.IGNORECASE
)

LOW_PRIORITY_PATTERN = re.compile(
    r"\b(?:когда-нибудь|на\s+потом|не\s+к\s+спеху|без\s+спешки|низк\w*\s+приоритет\w*)\b",
    re.IGNORECASE,
)

NEAR_DAY_PATTERN = re.compile(r"\b(?:сегодня|завтра|послезавтра)\b", re.IGNORECASE)

WEEKDAY_PATTERNS = [
    (re.compile(r"\bпонедельник\w*"), 0),
    (re.compile(r"\bвторник\w*"), 1),
    (re.compile(r"\bсред(?:а|у|ы|е)\b"), 2),
    (re.compile(r"\bчетверг\w*"), 3),
    (re.compile(r"\bпятниц\w*"), 4),
    (re.compile(r"\bсуббот\w*"), 5),
    (re.compile(r"\bвоскресень\w*"), 6),
]

NUMERIC_DATE_PATTERN = re.compile(r"\b(\d{1,2})[./](\d{2})(?:[./](\d{2,4}))?\b")

DATE_HINT_PATTERN = re.compile(
    r"\bчерез\b"
    r"|\b(?:январ|феврал|март\w*|апрел|август\w*|сентябр|октябр|ноябр|декабр|июн\w*|июл\w*)\w*"
    r"|\bма[йяе]\b"
    r"|\bнедел\w*"
    r"|\bмесяц\w*"
)


_MONTH_PATTERN = (
    r"(?:январ\w*|феврал\w*|март\w*|апрел\w*|ма[йяе]|июн\w*|июл\w*"
    r"|август\w*|сентябр\w*|октябр\w*|ноябр\w*|декабр\w*)"
)

WORDED_DATE_STRIP_PATTERN = re.compile(
    rf"(?:\b(?:до|к|перед|на)\s+)?\b\d{{1,2}}(?:-го)?\s+{_MONTH_PATTERN}(?:\s+\d{{4}})?"
    rf"|\bчерез\s+(?:\d+\s+)?(?:день|дн[яей]|недел\w*|месяц\w*)\b"
    rf"|\bна\s+(?:этой|следующей)\s+неделе\b",
    re.IGNORECASE,
)

NUMERIC_DATE_STRIP_PATTERN = re.compile(
    rf"(?:\b(?:до|к)\s+)?{NUMERIC_DATE_PATTERN.pattern}", re.IGNORECASE
)

WEEKDAY_STRIP_PATTERN = re.compile(
    r"(?:\b(?:в|во|до|к)\s+)?"
    r"(?:\bпонедельник\w*|\bвторник\w*|\bсред(?:а|у|ы|е)\b|\bчетверг\w*"
    r"|\bпятниц\w*|\bсуббот\w*|\bвоскресень\w*)",
    re.IGNORECASE,
)

# NEGATED_URGENT раньше URGENT: иначе от «не срочно» останется висячее «не»
_STRIP_PATTERNS = [
    NEGATED_URGENT_PATTERN,
    LOW_PRIORITY_PATTERN,
    URGENT_PATTERN,
    NEAR_DAY_PATTERN,
    WEEKDAY_STRIP_PATTERN,
    NUMERIC_DATE_STRIP_PATTERN,
    WORDED_DATE_STRIP_PATTERN,
]


def strip_schedule_words(text: str) -> str:
    """Убирает даты и слова срочности: они — сигнал для приоритета,
    но шум для определения категории."""
    for pattern in _STRIP_PATTERNS:
        text = pattern.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def _days_until_weekday(target_weekday: int) -> int:
    today = datetime.now().weekday()
    delta = (target_weekday - today) % 7
    return delta if delta != 0 else 7


def _numeric_date_days(text: str, today: date) -> int | None:
    days = None
    for match in NUMERIC_DATE_PATTERN.finditer(text):
        day, month = int(match[1]), int(match[2])
        year = match[3]
        try:
            if year:
                year_value = int(year)
                if year_value < 100:
                    year_value += 2000
                candidate = date(year_value, month, day)
            else:
                candidate = date(today.year, month, day)
                if candidate < today:
                    candidate = date(today.year + 1, month, day)
        except ValueError:
            continue
        delta = (candidate - today).days
        if delta >= 0 and (days is None or delta < days):
            days = delta
    return days


def _worded_date_days(text: str, today: date) -> int | None:
    if not DATE_HINT_PATTERN.search(text):
        return None

    try:
        found = search_dates(
            text,
            languages=["ru"],
            settings={"PREFER_DATES_FROM": "future", "DATE_ORDER": "DMY"},
        )
    except Exception:
        return None

    if not found:
        return None

    days = None
    for fragment, parsed in found:
        if not DATE_HINT_PATTERN.search(fragment.lower()):
            continue
        delta = (parsed.date() - today).days
        if delta >= 0 and (days is None or delta < days):
            days = delta
    return days


def _days_until_deadline(text: str) -> int | None:
    today = datetime.now().date()
    candidates = [
        days
        for days in (_numeric_date_days(text, today), _worded_date_days(text, today))
        if days is not None
    ]
    return min(candidates) if candidates else None


def detect_priority(text: str) -> str:
    lowered = text.lower()

    if NEGATED_URGENT_PATTERN.search(lowered) or LOW_PRIORITY_PATTERN.search(lowered):
        return "low"

    if URGENT_PATTERN.search(lowered):
        return "high"

    if NEAR_DAY_PATTERN.search(lowered):
        return "high"

    for pattern, weekday in WEEKDAY_PATTERNS:
        if pattern.search(lowered):
            return "high" if _days_until_weekday(weekday) <= 2 else "medium"

    deadline_days = _days_until_deadline(lowered)
    if deadline_days is not None:
        return "high" if deadline_days <= 2 else "medium"

    return "medium"
