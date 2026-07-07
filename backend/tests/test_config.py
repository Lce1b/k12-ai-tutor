"""
Tests for config.py — environment variable loading.
"""

import os
import importlib
from unittest.mock import patch


class TestConfig:
    def test_default_llm_api_key(self, monkeypatch):
        """LLM_API_KEY defaults to 'sk-xxx' when not set."""
        monkeypatch.delenv("LLM_API_KEY", raising=False)
        with patch("dotenv.load_dotenv"):  # Prevent .env file from setting it
            import config
            importlib.reload(config)
        assert config.LLM_API_KEY == "sk-xxx"

    def test_custom_llm_api_key(self, monkeypatch):
        """LLM_API_KEY picks up the environment variable."""
        monkeypatch.setenv("LLM_API_KEY", "sk-custom-test")
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.LLM_API_KEY == "sk-custom-test"

    def test_default_llm_base_url(self, monkeypatch):
        """LLM_BASE_URL defaults to OpenAI v1."""
        monkeypatch.delenv("LLM_BASE_URL", raising=False)
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.LLM_BASE_URL == "https://api.openai.com/v1"

    def test_custom_llm_base_url(self, monkeypatch):
        """LLM_BASE_URL picks up env var for custom providers (DeepSeek, Qwen, etc)."""
        monkeypatch.setenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.LLM_BASE_URL == "https://api.deepseek.com/v1"

    def test_default_model(self, monkeypatch):
        """LLM_MODEL defaults to gpt-4o-mini."""
        monkeypatch.delenv("LLM_MODEL", raising=False)
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.LLM_MODEL == "gpt-4o-mini"

    def test_custom_model(self, monkeypatch):
        """LLM_MODEL supports switching models (deepseek-chat, qwen-turbo, etc)."""
        monkeypatch.setenv("LLM_MODEL", "deepseek-chat")
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.LLM_MODEL == "deepseek-chat"

    def test_default_embed_model(self, monkeypatch):
        """EMBED_MODEL defaults to all-MiniLM-L6-v2."""
        monkeypatch.delenv("EMBED_MODEL", raising=False)
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.EMBED_MODEL == "all-MiniLM-L6-v2"

    def test_default_chroma_path(self, monkeypatch):
        """CHROMA_PATH defaults to ./chroma_db."""
        monkeypatch.delenv("CHROMA_PATH", raising=False)
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.CHROMA_PATH == "./chroma_db"

    def test_mysql_host_default(self, monkeypatch):
        """MYSQL_HOST defaults to localhost."""
        monkeypatch.delenv("MYSQL_HOST", raising=False)
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.MYSQL_HOST == "localhost"

    def test_mysql_port_default(self, monkeypatch):
        """MYSQL_PORT defaults to 3306."""
        monkeypatch.delenv("MYSQL_PORT", raising=False)
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.MYSQL_PORT == 3306

    def test_mysql_port_custom(self, monkeypatch):
        """MYSQL_PORT parses custom value as int."""
        monkeypatch.setenv("MYSQL_PORT", "3307")
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.MYSQL_PORT == 3307

    def test_mysql_db_default(self, monkeypatch):
        """MYSQL_DB defaults to k12_tutor."""
        monkeypatch.delenv("MYSQL_DB", raising=False)
        with patch("dotenv.load_dotenv"):
            import config
            importlib.reload(config)
        assert config.MYSQL_DB == "k12_tutor"
