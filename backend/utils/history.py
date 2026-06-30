"""
Learning history persistence — progress, gamification, interest tracking.
"""

import json
import os
import time
from collections import Counter

HISTORY_DIR = os.path.join(os.path.dirname(__file__), "..", "history")


def _ensure_dir():
    os.makedirs(HISTORY_DIR, exist_ok=True)


def _path(session_id: str) -> str:
    return os.path.join(HISTORY_DIR, f"{session_id}.json")


def load(session_id: str) -> dict:
    _ensure_dir()
    path = _path(session_id)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return _empty_state(session_id)


def save(session_id: str, state: dict):
    _ensure_dir()
    state["updated_at"] = time.time()
    with open(_path(session_id), "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def _empty_state(session_id: str) -> dict:
    return {
        "session_id": session_id,
        "created_at": time.time(),
        "updated_at": time.time(),
        "grade": "middle",
        "total_messages": 0,
        "topics_studied": [],
        "topic_frequency": {},
        "quiz_history": [],
        "total_quizzes": 0,
        "correct_answers": 0,
        "streak": 0,
        "max_streak": 0,
        "xp": 0,
        "level": 1,
        "mastered_topics": [],
        "weak_topics": [],
    }


# ---- XP / Level ----

def xp_for_level(level: int) -> int:
    return 100 * level


def add_xp(session_id: str, amount: int) -> dict:
    """Add XP and handle level-up. Returns level-up info."""
    state = load(session_id)
    state["xp"] = state.get("xp", 0) + amount
    old_level = state.get("level", 1)
    new_level = old_level
    while state["xp"] >= xp_for_level(new_level):
        state["xp"] -= xp_for_level(new_level)
        new_level += 1
    state["level"] = new_level
    save(session_id, state)
    return {
        "xp": state["xp"],
        "level": new_level,
        "leveled_up": new_level > old_level,
        "xp_for_next": xp_for_level(new_level),
    }


# ---- Streak ----

def record_streak(session_id: str, is_correct: bool) -> dict:
    """Update answer streak. Returns streak info."""
    state = load(session_id)
    if is_correct:
        state["streak"] = state.get("streak", 0) + 1
        if state["streak"] > state.get("max_streak", 0):
            state["max_streak"] = state["streak"]
    else:
        state["streak"] = 0
    save(session_id, state)
    return {"streak": state["streak"], "max_streak": state.get("max_streak", 0)}


# ---- Topic Interest ----

def record_message(session_id: str, grade: str, topic: str, intent: str):
    state = load(session_id)
    state["grade"] = grade
    state["total_messages"] += 1

    if topic and topic not in [t["topic"] for t in state["topics_studied"]]:
        state["topics_studied"].append({
            "topic": topic,
            "intent": intent,
            "timestamp": time.time(),
        })

    # Track topic frequency for interest-based recommendation
    freq = state.get("topic_frequency", {})
    freq[topic] = freq.get(topic, 0) + 1
    state["topic_frequency"] = freq

    save(session_id, state)


def record_quiz_result(session_id: str, topic: str, is_correct: bool):
    state = load(session_id)
    state["total_quizzes"] += 1
    if is_correct:
        state["correct_answers"] += 1

    state["quiz_history"].append({
        "topic": topic,
        "is_correct": is_correct,
        "timestamp": time.time(),
    })

    _update_mastery(state, topic)
    save(session_id, state)


def _update_mastery(state: dict, topic: str):
    topic_quizzes = [q for q in state["quiz_history"] if q["topic"] == topic][-10:]
    if len(topic_quizzes) < 3:
        return

    accuracy = sum(1 for q in topic_quizzes if q["is_correct"]) / len(topic_quizzes)

    if accuracy >= 0.8:
        if topic not in state["mastered_topics"]:
            state["mastered_topics"].append(topic)
        if topic in state["weak_topics"]:
            state["weak_topics"].remove(topic)
    elif accuracy <= 0.4:
        if topic not in state["weak_topics"]:
            state["weak_topics"].append(topic)
        if topic in state["mastered_topics"]:
            state["mastered_topics"].remove(topic)


def get_stats(session_id: str) -> dict:
    state = load(session_id)
    total_q = state["total_quizzes"]
    freq = state.get("topic_frequency", {})
    return {
        "total_messages": state["total_messages"],
        "total_quizzes": total_q,
        "accuracy": round(state["correct_answers"] / total_q, 2) if total_q > 0 else 0,
        "topics_studied": len(state["topics_studied"]),
        "mastered_topics": state["mastered_topics"],
        "weak_topics": state["weak_topics"],
        "recent_topics": [t["topic"] for t in state["topics_studied"][-5:]],
        # Gamification
        "level": state.get("level", 1),
        "xp": state.get("xp", 0),
        "xp_for_next": xp_for_level(state.get("level", 1)),
        "streak": state.get("streak", 0),
        "max_streak": state.get("max_streak", 0),
        # Interest
        "top_interests": [t for t, _ in Counter(freq).most_common(5)] if freq else [],
    }
