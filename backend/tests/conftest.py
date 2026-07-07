"""
Shared test fixtures for the K12 AI Tutor backend.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture(autouse=True)
def mock_env(monkeypatch):
    """Default environment variables for all tests."""
    monkeypatch.setenv("LLM_API_KEY", "sk-test-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://api.test.com/v1")
    monkeypatch.setenv("LLM_MODEL", "gpt-4o-mini")
    monkeypatch.setenv("EMBED_MODEL", "all-MiniLM-L6-v2")
    monkeypatch.setenv("CHROMA_PATH", "./chroma_db")
    monkeypatch.setenv("MYSQL_HOST", "localhost")
    monkeypatch.setenv("MYSQL_PORT", "3306")
    monkeypatch.setenv("MYSQL_USER", "root")
    monkeypatch.setenv("MYSQL_PASSWORD", "")
    monkeypatch.setenv("MYSQL_DB", "k12_tutor")


@pytest.fixture
def mock_openai_client():
    """Return a mocked AsyncOpenAI instance."""
    with patch("openai.AsyncOpenAI", autospec=True) as mock_cls:
        client = AsyncMock()
        mock_cls.return_value = client
        yield client


@pytest.fixture
def sample_quiz_question():
    return {
        "type": "choice",
        "question": "什么是人工智能？",
        "options": ["A. 让机器像人一样思考", "B. 一种编程语言", "C. 一种硬件", "D. 一种操作系统"],
        "answer": "A",
        "explanation": "人工智能是让计算机模拟人类智能的技术。",
    }
