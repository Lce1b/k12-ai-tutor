"""
Integration tests for main.py — FastAPI app: health, CORS, all 6 interaction
modes, quiz eval, code exec, templates, OCR, and request validation.

Full mock stack: MySQL pool + RAG + LLM (all 8 agent modules).
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient


# ── Mock stack fixture ─────────────────────────────────────────────────

# Intent keywords → intent value for the smart LLM mock
_INTENT_TABLE = {
    "动画": "animate", "演示": "animate", "可视化": "animate",
    "上课": "teach", "教我": "teach", "课程": "teach", "讲解": "teach",
    "练习": "quiz", "测验": "quiz", "考题": "quiz", "题目": "quiz",
    "代码": "code", "编程": "code", "python": "code",
    "绘本": "picture_book", "故事": "picture_book",
}

def _extract_intent(user_msg: str) -> str:
    m = user_msg.lower()
    for kw, intent in _INTENT_TABLE.items():
        if kw in m:
            return intent
    return "chat"


@pytest.fixture
def app_with_full_mocks(monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "sk-test")
    monkeypatch.setenv("LLM_BASE_URL", "https://api.test.com/v1")
    monkeypatch.setenv("LLM_MODEL", "gpt-4o-mini")

    # -- DB pool --
    mock_cursor = AsyncMock()
    mock_cursor.fetchone = AsyncMock(return_value=None)
    mock_cursor.fetchall = AsyncMock(return_value=[])
    mock_cursor.execute = AsyncMock()
    mock_cursor.__aenter__ = AsyncMock(return_value=mock_cursor)
    mock_cursor.__aexit__ = AsyncMock(return_value=None)

    mock_conn = MagicMock()
    mock_conn.cursor = MagicMock(return_value=mock_cursor)

    mock_pool = MagicMock()
    mock_pool.acquire = AsyncMock(return_value=mock_conn)
    mock_pool.release = AsyncMock()
    mock_pool.close = MagicMock()
    mock_pool.wait_closed = AsyncMock()

    mock_init_db = AsyncMock()
    mock_init_schema = AsyncMock()
    mock_close_db = AsyncMock()

    # -- RAG --
    mock_rag = MagicMock()
    mock_rag.search.return_value = []

    # -- LLM (smart: classifies intent from user message, generates agent content) --
    mock_llm = AsyncMock()

    async def llm_response(*, messages, model, temperature=0, max_tokens=100, response_format=None, **kw):
        content = ""
        for m in messages:
            if m.get("role") == "user":
                content = m["content"]
                break

        choice = MagicMock()

        # Intent classification: extract user message from prompt & classify
        if "意图类型" in content and "用户消息:" in content:
            user_msg = content.split("用户消息:")[-1].strip()
            intent = _extract_intent(user_msg)
            choice.message.content = f'{{"intent": "{intent}", "confidence": 0.95}}'

        # Greeting
        elif "欢迎" in content:
            choice.message.content = '{"greeting": "欢迎来到AI课堂！", "suggestions": [{"text": "什么是AI", "action": "teach", "topic": "AI"}, {"text": "AI能做什么", "action": "chat", "topic": "AI应用"}, {"text": "做个练习", "action": "quiz", "topic": "AI测验"}]}'

        # Next-step suggestion
        elif "下一步" in content:
            choice.message.content = '{"message": "学得不错！继续加油~", "suggestions": [{"text": "深入学习", "action": "teach", "topic": "进阶内容"}]}'

        # Quiz generation
        elif "练习题" in content or "测验" in content:
            choice.message.content = '{"questions": [{"type": "choice", "question": "AI的全称？", "options": ["A. Artificial Intelligence", "B. Auto Input", "C. All Info", "D. 以上都错"], "answer": "A", "explanation": "Artificial Intelligence"}, {"type": "choice", "question": "ML的全称？", "options": ["A. Machine Learning", "B. More Language", "C. Multi Layer", "D. 以上都错"], "answer": "A", "explanation": "Machine Learning"}]}'

        # Teaching
        elif "微课" in content or "课程结构" in content:
            choice.message.content = '{"title": "AI基础教程", "intro": "一起探索AI的世界！", "sections": [{"heading": "什么是AI", "content": "AI就是人工智能。", "example": "像Siri就是AI助手"}], "knowledge_cards": [{"term": "AI", "definition": "人工智能", "icon": "🤖"}], "interaction": "你见过AI吗？", "summary": "AI让机器变聪明。"}'

        # Animation
        elif "HTML动画" in content or ("动画" in content and "canvas" not in content):
            choice.message.content = '<html><head><title>Demo</title></head><body><canvas id="c" width="600" height="400"></canvas><script>const ctx=document.getElementById("c").getContext("2d");ctx.fillText("Neural Network Demo",50,50);</script></body></html>'

        # Picture book
        elif "绘本" in content and "故事" in content:
            choice.message.content = '{"title": "AI的冒险", "pages": [{"text": "从前有一个聪明的机器人叫小智", "image_prompt": "a cute robot in a library"}], "moral": "学习使人进步"}'

        # Code generation
        elif "Python教学代码" in content:
            choice.message.content = '{"title": "Hello AI", "explanation": "打印Hello World", "code": "print(\'Hello AI!\')", "expected_output": "Hello AI!", "challenge": "修改输出内容"}'

        # PPT / Word
        elif "PPT内容" in content:
            choice.message.content = '{"title": "AI课件", "slides": [{"heading": "AI概述", "bullets": ["AI定义", "AI历史"]}]}'
        elif "教学文档" in content:
            choice.message.content = '{"title": "AI教学文档", "objectives": ["了解AI"], "concepts": [{"term": "AI", "explanation": "人工智能"}], "content": "详细讲解", "example": "生活例子", "questions": ["思考题"]}'

        else:
            choice.message.content = '{"intent": "chat", "confidence": 0.9}'

        mock_resp = MagicMock()
        mock_resp.choices = [choice]
        return mock_resp

    mock_llm.chat.completions.create = AsyncMock(side_effect=llm_response)

    with patch("db.init_db", mock_init_db), \
         patch("db.init_schema", mock_init_schema), \
         patch("db.close_db", mock_close_db), \
         patch("db._pool", mock_pool), \
         patch("utils.rag.rag", mock_rag), \
         patch("agents.orchestrator.client", mock_llm), \
         patch("agents.dialogue.client", mock_llm), \
         patch("agents.teaching.client", mock_llm), \
         patch("agents.animation.client", mock_llm), \
         patch("agents.quiz.client", mock_llm), \
         patch("agents.coding.client", mock_llm), \
         patch("agents.picturebook.client", mock_llm), \
         patch("agents.resources.client", mock_llm), \
         patch("agents.ppt_parser.client", mock_llm):

        from main import app
        yield app


@pytest.fixture
def client(app_with_full_mocks):
    return TestClient(app_with_full_mocks)


# ── Health & CORS & Routes ─────────────────────────────────────────────

class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.json()["service"] == "K12 AI Tutor"

    def test_health_content_type(self, client):
        assert client.get("/health").headers["content-type"] == "application/json"


class TestCORS:
    def test_cors_allows_localhost_3000(self, client):
        r = client.get("/health", headers={"Origin": "http://localhost:3000"})
        assert r.status_code == 200
        assert r.headers["access-control-allow-origin"] == "http://localhost:3000"


class TestRouterRegistration:
    def test_all_routes_registered(self, client):
        routes = {r.path for r in client.app.routes}
        expected = {
            "/health", "/api/greeting", "/api/chat", "/api/quiz/eval",
            "/api/code/exec", "/api/code/templates", "/api/code/templates/{template_id}",
            "/api/curriculum", "/api/session/{session_id}", "/api/stats/{session_id}",
            "/api/resources/upload", "/api/resources/ocr-status",
            "/api/resources/ppt/deep-parse", "/api/resources/ppt", "/api/resources/word",
        }
        for path in expected:
            assert path in routes, f"Missing route: {path}"

    def test_openapi_docs(self, client):
        assert client.get("/docs").status_code == 200

    def test_openapi_schema(self, client):
        s = client.get("/openapi.json").json()
        assert s["info"]["title"] == "K12 AI Tutor"
        assert s["info"]["version"] == "0.2.0"


# ── Greeting ────────────────────────────────────────────────────────────

class TestApiGreeting:
    def test_returns_greeting_and_suggestions(self, client):
        data = client.get("/api/greeting?session_id=t&grade=middle").json()
        assert "greeting" in data
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)

    def test_includes_grade(self, client):
        assert client.get("/api/greeting?session_id=t&grade=primary_low").json()["grade"] == "primary_low"

    def test_defaults_to_middle(self, client):
        assert client.get("/api/greeting?session_id=t").json()["grade"] == "middle"


# ── Six interaction modes via /api/chat ─────────────────────────────────

class TestAllSixIntents:
    """Each test sends a message that the mock classifies into the target intent,
    then verifies the response `type` field and structured payload."""

    def test_intent_chat(self, client):
        """Free-form Q&A → type=chat with markdown message."""
        r = client.post("/api/chat", json={
            "session_id": "s1", "message": "什么是AI", "grade": "middle",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["intent"] == "chat"
        assert data["type"] == "chat"
        assert "message" in data
        assert "next_step" in data

    def test_intent_teach(self, client):
        """Request to teach → type=lesson with structured lesson data."""
        r = client.post("/api/chat", json={
            "session_id": "s2", "message": "给我上课讲解神经网络", "grade": "middle",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["intent"] == "teach"
        assert data["type"] == "lesson"
        assert "lesson" in data
        lesson = data["lesson"]
        assert "title" in lesson
        assert "sections" in lesson
        assert "knowledge_cards" in lesson

    def test_intent_animate(self, client):
        """Request animation → type=animation with animation_config dict."""
        r = client.post("/api/chat", json={
            "session_id": "s3", "message": "用动画演示神经网络是怎么工作的", "grade": "high",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["intent"] == "animate"
        assert data["type"] == "animation"
        assert "animation_config" in data
        config = data["animation_config"]
        assert "type" in config
        assert config["type"] in ("neural_network", "gradient_descent", "sorting", "decision_tree", "kmeans")

    def test_intent_quiz(self, client):
        """Request quiz → type=quiz with questions array."""
        r = client.post("/api/chat", json={
            "session_id": "s4", "message": "给我出几道AI练习题", "grade": "middle",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["intent"] == "quiz"
        assert data["type"] == "quiz"
        assert "quiz" in data
        questions = data["quiz"]["questions"]
        assert isinstance(questions, list)
        assert len(questions) >= 1
        q = questions[0]
        for field in ("type", "question", "options", "answer", "explanation"):
            assert field in q, f"Missing field '{field}' in quiz question"

    def test_intent_code(self, client):
        """Request coding → type=code with code snippet."""
        r = client.post("/api/chat", json={
            "session_id": "s5", "message": "写一段Python代码", "grade": "high",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["intent"] == "code"
        assert data["type"] == "code"
        assert "code" in data
        c = data["code"]
        for field in ("title", "explanation", "code", "challenge"):
            assert field in c, f"Missing field '{field}' in code response"

    def test_intent_picture_book(self, client):
        """Request picture book → type=picture_book with story data."""
        r = client.post("/api/chat", json={
            "session_id": "s6", "message": "给我讲个绘本故事", "grade": "primary_low",
        })
        assert r.status_code == 200
        data = r.json()
        assert data["intent"] == "picture_book"
        assert data["type"] == "picture_book"
        assert "story" in data
        story = data["story"]
        assert "title" in story
        assert "pages" in story
        assert isinstance(story["pages"], list)
        assert len(story["pages"]) > 0

    def test_all_intents_return_next_step(self, client):
        """Every intent response includes a proactive next_step suggestion."""
        messages = {
            "chat": "什么是人工智能",
            "teach": "给我上课讲解机器学习",
            "animate": "用动画演示一下神经网络",
            "quiz": "出几道AI练习题",
            "code": "写一段Python代码",
            "picture_book": "讲个绘本故事给我听",
        }
        for intent, msg in messages.items():
            r = client.post("/api/chat", json={
                "session_id": f"sn_{intent}", "message": msg, "grade": "middle",
            })
            assert r.status_code == 200, f"Failed for intent={intent}"
            data = r.json()
            assert "next_step" in data, f"Missing next_step for intent={intent}"
            assert "message" in data["next_step"]


# ── Quiz eval ──────────────────────────────────────────────────────────

class TestQuizEval:
    def test_correct_answer(self, client):
        data = client.post("/api/quiz/eval", json={
            "question": {"answer": "A", "explanation": "因为A是对的"},
            "answer": "A", "session_id": "t", "topic": "AI",
        }).json()
        assert data["is_correct"] is True
        assert "xp" in data
        assert "streak" in data

    def test_wrong_answer(self, client):
        data = client.post("/api/quiz/eval", json={
            "question": {"answer": "B", "explanation": "没错"},
            "answer": "C", "session_id": "t", "topic": "ML",
        }).json()
        assert data["is_correct"] is False
        assert "B" in data["feedback"]

    def test_requires_question(self, client):
        assert client.post("/api/quiz/eval", json={}).status_code == 422


# ── Code exec ──────────────────────────────────────────────────────────

class TestCodeExec:
    def test_safe_code(self, client):
        data = client.post("/api/code/exec", json={"code": "print(1+1)"}).json()
        assert "success" in data
        assert "stdout" in data

    def test_requires_code(self, client):
        assert client.post("/api/code/exec", json={}).status_code == 422


# ── Read-only endpoints ────────────────────────────────────────────────

class TestCurriculum:
    def test_curriculum(self, client):
        assert isinstance(client.get("/api/curriculum").json(), dict)


class TestCodeTemplates:
    def test_list(self, client):
        assert len(client.get("/api/code/templates?grade=middle").json()["templates"]) > 0

    def test_detail(self, client):
        data = client.get("/api/code/templates/bubble_sort").json()
        assert data["id"] == "bubble_sort"
        assert "code" in data

    def test_not_found(self, client):
        assert client.get("/api/code/templates/nonexistent").status_code == 404


class TestOcrStatus:
    def test_ocr(self, client):
        assert isinstance(client.get("/api/resources/ocr-status").json()["tesseract_available"], bool)


# ── Validation ─────────────────────────────────────────────────────────

class TestRequestValidation:
    def test_chat_requires_message(self, client):
        assert client.post("/api/chat", json={"session_id": "test"}).status_code == 422

    def test_chat_rejects_invalid_grade(self, client):
        r = client.post("/api/chat", json={
            "session_id": "t", "message": "hello", "grade": "invalid_grade",
        })
        assert r.status_code == 422
        assert "Invalid grade" in r.json()["error"]

    def test_code_exec_requires_code(self, client):
        assert client.post("/api/code/exec", json={}).status_code == 422
