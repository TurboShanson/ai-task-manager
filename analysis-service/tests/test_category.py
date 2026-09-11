from category import detect_category, resolve_category


# --- detect_category: слишком мало текста — категорию не определить ---

def test_empty_text_is_general():
    assert detect_category("") == ("general", 0.0)


def test_single_word_is_general():
    # одно слово без контекста — относим к general
    assert detect_category("Разное") == ("general", 0.0)


# --- resolve_category: выбор категории по готовым оценкам сходства ---
# Передаём готовые числа вместо нейросети — тест быстрый и понятный.

def test_picks_best_category():
    scores = {"business": 0.6, "study": 0.4, "personal": 0.2}
    assert resolve_category(scores) == ("business", 0.6)


def test_low_score_falls_back_to_general():
    # лучшая оценка ниже порога — значит «ни на что не похоже»
    scores = {"business": 0.2, "study": 0.1, "personal": 0.05}
    assert resolve_category(scores)[0] == "general"


def test_close_scores_fall_back_to_general():
    # две категории почти вровень — решение ненадёжно
    scores = {"business": 0.5, "study": 0.49, "personal": 0.1}
    assert resolve_category(scores)[0] == "general"
