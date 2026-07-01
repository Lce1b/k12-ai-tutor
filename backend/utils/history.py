"""
Learning history persistence — MySQL backend with gamification stats.
"""

import json
import time
from collections import Counter

from db import fetchone, execute


async def ensure_session(session_id: str, grade: str = "middle"):
    existing = await fetchone("SELECT id FROM sessions WHERE id = %s", (session_id,))
    if not existing:
        await execute(
            "INSERT INTO sessions (id, grade) VALUES (%s, %s)",
            (session_id, grade),
        )
        await execute(
            "INSERT INTO learning_state (session_id) VALUES (%s)",
            (session_id,),
        )
    else:
        await execute(
            "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = %s",
            (session_id,),
        )


async def _get_state(session_id: str) -> dict:
    row = await fetchone(
        "SELECT * FROM learning_state WHERE session_id = %s", (session_id,)
    )
    if not row:
        return _empty_state(session_id)
    row["mastered_topics"] = json.loads(row.get("mastered_topics", "[]") or "[]")
    row["weak_topics"] = json.loads(row.get("weak_topics", "[]") or "[]")
    row["topic_frequency"] = json.loads(row.get("topic_frequency", "{}") or "{}")
    return row


async def _save_state(state: dict):
    await execute(
        """INSERT INTO learning_state
           (session_id, xp, `level`, streak, max_streak, total_messages,
            total_quizzes, correct_answers, mastered_topics, weak_topics, topic_frequency)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE
           xp = VALUES(xp), `level` = VALUES(`level`),
           streak = VALUES(streak), max_streak = VALUES(max_streak),
           total_messages = VALUES(total_messages),
           total_quizzes = VALUES(total_quizzes),
           correct_answers = VALUES(correct_answers),
           mastered_topics = VALUES(mastered_topics),
           weak_topics = VALUES(weak_topics),
           topic_frequency = VALUES(topic_frequency)""",
        (
            state["session_id"], state["xp"], state["level"], state["streak"],
            state["max_streak"], state["total_messages"], state["total_quizzes"],
            state["correct_answers"],
            json.dumps(state["mastered_topics"], ensure_ascii=False),
            json.dumps(state["weak_topics"], ensure_ascii=False),
            json.dumps(state["topic_frequency"], ensure_ascii=False),
        ),
    )


def _empty_state(session_id: str) -> dict:
    return {
        "session_id": session_id,
        "xp": 0, "level": 1, "streak": 0, "max_streak": 0,
        "total_messages": 0, "total_quizzes": 0, "correct_answers": 0,
        "mastered_topics": [], "weak_topics": [], "topic_frequency": {},
    }


# ---- XP / Level ----

def xp_for_level(level: int) -> int:
    return 100 * level


async def add_xp(session_id: str, amount: int) -> dict:
    state = await _get_state(session_id)
    state["xp"] += amount
    old_level = state["level"]
    new_level = old_level
    while state["xp"] >= xp_for_level(new_level):
        state["xp"] -= xp_for_level(new_level)
        new_level += 1
    state["level"] = new_level
    await _save_state(state)
    return {
        "xp": state["xp"], "level": new_level,
        "leveled_up": new_level > old_level,
        "xp_for_next": xp_for_level(new_level),
    }


# ---- Streak ----

async def record_streak(session_id: str, is_correct: bool) -> dict:
    state = await _get_state(session_id)
    if is_correct:
        state["streak"] += 1
        if state["streak"] > state["max_streak"]:
            state["max_streak"] = state["streak"]
    else:
        state["streak"] = 0
    await _save_state(state)
    return {"streak": state["streak"], "max_streak": state["max_streak"]}


# ---- Topic Interest ----

async def record_message(session_id: str, grade: str, topic: str, intent: str):
    await ensure_session(session_id, grade)
    state = await _get_state(session_id)
    state["total_messages"] += 1
    freq = state.get("topic_frequency", {})
    freq[topic] = freq.get(topic, 0) + 1
    state["topic_frequency"] = freq
    await _save_state(state)


async def record_quiz_result(session_id: str, topic: str, is_correct: bool):
    await ensure_session(session_id)
    state = await _get_state(session_id)
    state["total_quizzes"] += 1
    if is_correct:
        state["correct_answers"] += 1

    await execute(
        "INSERT INTO quiz_results (session_id, topic, is_correct) VALUES (%s, %s, %s)",
        (session_id, topic, is_correct),
    )

    _update_mastery(state, topic)
    await _save_state(state)


def _update_mastery(state: dict, topic: str):
    # Mastery will be recalculated from DB on next stats fetch
    pass


# ---- Stats ----

async def get_stats(session_id: str) -> dict:
    state = await _get_state(session_id)
    total_q = state["total_quizzes"]
    freq = state.get("topic_frequency", {})

    # Recalculate mastery from quiz_results
    rows = await fetchall(
        "SELECT topic, is_correct FROM quiz_results WHERE session_id = %s ORDER BY created_at DESC",
        (session_id,),
    )
    topic_results = {}
    for r in rows:
        topic_results.setdefault(r["topic"], []).append(r["is_correct"])
    mastered = [t for t, results in topic_results.items()
                if len(results) >= 3 and sum(results) / len(results) >= 0.8]
    weak = [t for t, results in topic_results.items()
            if len(results) >= 3 and sum(results) / len(results) <= 0.4]

    return {
        "total_messages": state["total_messages"],
        "total_quizzes": total_q,
        "accuracy": round(state["correct_answers"] / total_q, 2) if total_q > 0 else 0,
        "topics_studied": len(freq),
        "mastered_topics": mastered,
        "weak_topics": weak,
        "recent_topics": [t for t, _ in Counter(freq).most_common(5)],
        "level": state["level"],
        "xp": state["xp"],
        "xp_for_next": xp_for_level(state["level"]),
        "streak": state["streak"],
        "max_streak": state["max_streak"],
        "top_interests": [t for t, _ in Counter(freq).most_common(5)] if freq else [],
    }
