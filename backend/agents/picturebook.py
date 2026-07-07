"""
Picture Book Agent — generates illustrated stories for young learners.
"""

import json
import httpx
from openai import AsyncOpenAI

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from agents.orchestrator import GradeLevel

client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL, timeout=httpx.Timeout(120.0, connect=10.0))


async def generate_story(topic: str, grade: GradeLevel) -> dict:
    """Generate an illustrated storybook page about an AI concept."""

    style_map = {
        GradeLevel.P1: "简单的绘本故事，主角是可爱的小动物，用温暖的童话解释AI概念，每页2-3句话",
        GradeLevel.P2: "探险故事，主角是好奇的小朋友和AI伙伴，用冒险来解释技术概念",
        GradeLevel.M: "科幻小故事，情节更复杂，融入更多技术细节但保持故事性",
        GradeLevel.H: "深度科普叙事，用真实的技术历史或思想实验展开",
    }

    prompt = f"""创作一个关于「{topic}」的绘本故事。

{style_map.get(grade, style_map[GradeLevel.P1])}

返回JSON：
{{
  "title": "故事标题",
  "pages": [
    {{
      "text": "这一页的叙述文字（1-3句话）",
      "image_prompt": "给AI绘图模型的英文提示词，描述这一页的画面（cartoon style, children illustration）"
    }}
  ],
  "moral": "故事蕴含的道理（一句话）"
}}

生成4页故事。"""

    resp = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.9,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )

    try:
        return json.loads(resp.choices[0].message.content)
    except json.JSONDecodeError:
        return {"title": topic, "pages": [], "moral": ""}
