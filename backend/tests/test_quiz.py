"""
Tests for quiz.py — answer evaluation (non-LLM portions).
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from agents.quiz import evaluate_answer


class TestEvaluateAnswer:
    @pytest.mark.asyncio
    async def test_correct_answer(self, sample_quiz_question):
        """Returns is_correct=True when answer matches."""
        result = await evaluate_answer(sample_quiz_question, "A")
        assert result["is_correct"] is True
        assert result["correct_answer"] == "A"
        assert "正确" in result["feedback"]
        assert "太棒了" in result["feedback"]

    @pytest.mark.asyncio
    async def test_correct_answer_lowercase(self, sample_quiz_question):
        """Answer comparison is case-insensitive (user types lowercase)."""
        result = await evaluate_answer(sample_quiz_question, "a")
        assert result["is_correct"] is True

    @pytest.mark.asyncio
    async def test_wrong_answer(self, sample_quiz_question):
        """Returns is_correct=False when answer does not match."""
        result = await evaluate_answer(sample_quiz_question, "B")
        assert result["is_correct"] is False
        assert result["correct_answer"] == "A"
        assert "答错了" in result["feedback"]
        assert "A" in result["feedback"]

    @pytest.mark.asyncio
    async def test_answer_with_whitespace(self, sample_quiz_question):
        """Whitespace around answer is stripped."""
        result = await evaluate_answer(sample_quiz_question, "  A  ")
        assert result["is_correct"] is True

    @pytest.mark.asyncio
    async def test_feedback_includes_explanation(self, sample_quiz_question):
        """Feedback includes the answer explanation."""
        result = await evaluate_answer(sample_quiz_question, "A")
        assert result["explanation"] == "人工智能是让计算机模拟人类智能的技术。"

    @pytest.mark.asyncio
    async def test_default_explanation_when_missing(self):
        """Uses a default explanation when question has none."""
        q = {"type": "choice", "question": "测试", "answer": "B"}
        result = await evaluate_answer(q, "B")
        assert result["explanation"] == "继续加油！"

    @pytest.mark.asyncio
    async def test_correct_answer_strips_answer_option(self):
        """Correct answer field is stripped."""
        q = {"answer": " B ", "explanation": "ok"}
        result = await evaluate_answer(q, "B")
        assert result["is_correct"] is True

    @pytest.mark.asyncio
    async def test_wrong_answer_shows_correct_marking(self):
        """Wrong answer feedback includes the correct answer letter."""
        q = {"answer": "C", "explanation": "因为C是对的"}
        result = await evaluate_answer(q, "A")
        assert result["correct_answer"] == "C"
