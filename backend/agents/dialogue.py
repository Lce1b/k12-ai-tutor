"""
Dialogue Agent — handles free-form Q&A with RAG augmentation.
"""

from openai import AsyncOpenAI

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from agents.orchestrator import build_system_prompt, GradeLevel, Intent

client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)


async def chat(
    message: str,
    history: list[dict],
    grade: GradeLevel,
    intent: Intent,
    rag_context: str = "",
) -> str:
    system = build_system_prompt(grade, intent)

    if rag_context:
        system += f"\n\n## 参考知识库\n{rag_context}\n\n基于以上知识库内容回答，如果知识库没有相关信息就用自己的知识回答。"

    messages = [{"role": "system", "content": system}]
    # Include last 10 turns for context
    for h in history[-20:]:
        messages.append(h)
    messages.append({"role": "user", "content": message})

    resp = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1600,
    )
    return resp.choices[0].message.content
