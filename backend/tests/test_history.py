"""
Tests for history.py — XP calculation, streak, stats logic (non-DB).
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.history import xp_for_level, _empty_state


class TestXpForLevel:
    def test_level_1(self):
        """Level 1 requires 100 XP."""
        assert xp_for_level(1) == 100

    def test_level_2(self):
        """Level 2 requires 200 XP."""
        assert xp_for_level(2) == 200

    def test_level_10(self):
        """XP requirement scales linearly: 100 * level."""
        assert xp_for_level(10) == 1000

    def test_higher_levels_require_more_xp(self):
        """Each level requires more XP than the previous."""
        prev = xp_for_level(1)
        for level in range(2, 10):
            current = xp_for_level(level)
            assert current > prev
            prev = current

    def test_zero_xp_increase(self):
        """Gap between adjacent levels is constant at 100 XP."""
        for level in range(1, 20):
            assert xp_for_level(level + 1) - xp_for_level(level) == 100


class TestEmptyState:
    def test_default_values(self):
        """A new session starts with all zeros/empty."""
        state = _empty_state("test-session-1")
        assert state["session_id"] == "test-session-1"
        assert state["xp"] == 0
        assert state["level"] == 1
        assert state["streak"] == 0
        assert state["max_streak"] == 0
        assert state["total_messages"] == 0
        assert state["total_quizzes"] == 0
        assert state["correct_answers"] == 0
        assert state["mastered_topics"] == []
        assert state["weak_topics"] == []
        assert state["topic_frequency"] == {}

    def test_is_mutable_copy(self):
        """Each call returns a fresh dict (no shared references)."""
        s1 = _empty_state("a")
        s2 = _empty_state("b")
        s1["mastered_topics"].append("test")
        assert s2["mastered_topics"] == []
