"""
Teaching Agent — structured lesson delivery with knowledge cards.
"""

import json
import httpx
from openai import AsyncOpenAI

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from agents.orchestrator import build_system_prompt, GradeLevel, Intent

client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL, timeout=httpx.Timeout(120.0, connect=10.0))


async def teach(
    topic: str,
    history: list[dict],
    grade: GradeLevel,
) -> dict:
    """Generate a structured lesson with knowledge cards."""
    system = build_system_prompt(grade, Intent.TEACH)

    teach_prompt = f"""请为主题「{topic}」设计一节5分钟的微课。

返回JSON格式（不要markdown代码块）：
{{
  "title": "课程标题",
  "intro": "引入语，引起兴趣",
  "sections": [
    {{"heading": "小节标题", "content": "讲解内容", "example": "生活例子或比喻"}}
  ],
  "knowledge_cards": [
    {{"term": "概念名", "definition": "简洁定义", "icon": "emoji"}}
  ],
  "interaction": "一个互动提问（选择题或思考题）",
  "summary": "一句话小结"
}}
"""

    messages = [{"role": "system", "content": system}]
    for h in history[-10:]:
        messages.append(h)
    messages.append({"role": "user", "content": teach_prompt})

    resp = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )

    try:
        return json.loads(resp.choices[0].message.content)
    except json.JSONDecodeError:
        return {"title": topic, "intro": "让我们来学习吧！", "sections": [], "knowledge_cards": [], "interaction": "", "summary": ""}
