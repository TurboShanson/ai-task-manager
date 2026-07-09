from category import CATEGORY_MARGIN, CATEGORY_THRESHOLD, detect_category, resolve_category


def test_empty_text_is_general():
    assert detect_category("") == ("general", 0.0)


def test_single_word_is_general():
    assert detect_category("Разное") == ("general", 0.0)


def test_resolve_picks_best_category():
    scores = {"business": 0.6, "study": 0.4, "personal": 0.2}
    assert resolve_category(scores) == ("business", 0.6)


def test_resolve_below_threshold_falls_back_to_general():
    scores = {"business": CATEGORY_THRESHOLD - 0.01, "study": 0.1, "personal": 0.05}
    category, confidence = resolve_category(scores)
    assert category == "general"
    assert confidence == round(CATEGORY_THRESHOLD - 0.01, 3)


def test_resolve_small_margin_falls_back_to_general():
    best = 0.5
    scores = {"business": best, "study": best - CATEGORY_MARGIN + 0.01, "personal": 0.1}
    assert resolve_category(scores)[0] == "general"


def test_resolve_at_threshold_with_clear_margin_passes():
    scores = {"study": CATEGORY_THRESHOLD, "business": 0.2, "personal": 0.0}
    assert resolve_category(scores)[0] == "study"


def test_confidence_is_rounded():
    scores = {"personal": 0.61237, "business": 0.2, "study": 0.1}
    assert resolve_category(scores) == ("personal", 0.612)
