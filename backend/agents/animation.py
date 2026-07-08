"""
Animation Agent — generates JSON animation config for pre-built frontend components.
No more raw HTML generation. LLM outputs structured config, frontend renders it.
"""

import json
import re
import httpx
from openai import AsyncOpenAI

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from agents.orchestrator import GradeLevel

client = AsyncOpenAI(
    api_key=LLM_API_KEY,
    base_url=LLM_BASE_URL,
    timeout=httpx.Timeout(120.0, connect=10.0),
)

ANIMATION_SYSTEM = """你是一个教育动画配置生成器。根据用户请求，输出一个JSON动画配置。

## 动画类型

1. **neural_network** — 神经网络/深度学习
{ "type": "neural_network", "title": "...", "layers": [输入, 隐藏1, ..., 输出], "activations": ["relu",...], "showWeights": true, "animateForward": true }

2. **gradient_descent** — 梯度下降/优化
{ "type": "gradient_descent", "title": "...", "function": "bowl|saddle|himmelblau|rosenbrock|wavy", "startPoint": [-3, -3], "learningRate": 0.1, "steps": 30 }

3. **sorting** — 排序算法
{ "type": "sorting", "title": "...", "algorithm": "bubble|selection|quick|merge|insertion", "arraySize": 15, "speed": "normal" }

4. **decision_tree** — 决策树/分类
{ "type": "decision_tree", "title": "...", "tree": { "label": "根节点", "children": [{"label":"分支1","children":[],"isLeaf":true,"result":"结论"}] } }

5. **kmeans** — K-Means聚类
{ "type": "kmeans", "title": "...", "clusters": 3, "points": 50, "iterations": 5 }

6. **generic** — 不适配上述类型的通用话题（化学、生物、地理等非CS话题）
{ "type": "generic", "title": "...", "topicText": "话题文字", "message": "提示：这是一个通用可视化，该话题暂无专属动画", "particles": 40 }

## 规则
- 根据话题选择最合适的动画类型
- 非 CS/AI 话题（如生物细胞、化学、历史等）用 generic
- 学生水平影响参数复杂度
- 只输出JSON，不要其他文字
- 必须包含 type 字段"""


async def generate_animation(topic: str, grade: GradeLevel = GradeLevel.M) -> dict:
    """Generate an animation config dict, not raw HTML."""

    grade_hint = {
        GradeLevel.P1: "面向6-9岁小学生，用最简单的参数，比如layers只有[2,2,2]",
        GradeLevel.P2: "面向9-12岁学生，适当增加复杂度",
        GradeLevel.M: "面向12-15岁初中生，展示基础数学关系",
        GradeLevel.H: "面向15-18岁高中生，展示完整数学结构",
    }.get(grade, "面向初中生")

    prompt = f"话题：{topic}。{grade_hint}"

    resp = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": ANIMATION_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        max_tokens=1024,
        extra_body={"thinking": {"type": "disabled"}},
        response_format={"type": "json_object"},
    )

    text = resp.choices[0].message.content or "{}"
    return _parse_config(text, topic, grade)


def _parse_config(text: str, topic: str, grade: GradeLevel) -> dict:
    """Extract and validate JSON config. Falls back to keyword heuristic."""
    # Strip code fences if any
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```\w*\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)

    try:
        config = json.loads(text)
        if "type" in config:
            return _validate_and_fill(config, grade)
    except json.JSONDecodeError:
        pass

    return _fallback_config(topic, grade)


def _validate_and_fill(config: dict, grade: GradeLevel) -> dict:
    """Ensure required fields exist; fill defaults by grade level."""
    atype = config.get("type", "neural_network")

    defaults: dict = {"title": config.get("title", "")}

    if atype == "neural_network":
        defaults.setdefault("layers", [2, 3, 3, 1] if grade in (GradeLevel.P1, GradeLevel.P2) else [2, 4, 3, 1])
        defaults.setdefault("activations", ["relu", "relu", "sigmoid"])
        defaults.setdefault("showWeights", True)
        defaults.setdefault("animateForward", True)

    elif atype == "gradient_descent":
        defaults.setdefault("function", "bowl")
        defaults.setdefault("startPoint", [-5, -5])
        defaults.setdefault("learningRate", 0.1)
        defaults.setdefault("steps", 30)

    elif atype == "sorting":
        defaults.setdefault("algorithm", "bubble")
        defaults.setdefault("arraySize", 12)
        defaults.setdefault("speed", "normal")

    elif atype == "decision_tree":
        if "tree" not in config:
            defaults["tree"] = {
                "label": topic or "决策树",
                "children": [
                    {"label": "分支 A", "isLeaf": True, "result": "结果 A"},
                    {"label": "分支 B", "isLeaf": True, "result": "结果 B"},
                ],
            }

    elif atype == "kmeans":
        defaults.setdefault("clusters", 3)
        defaults.setdefault("points", 30)
        defaults.setdefault("iterations", 5)

    return {**config, **defaults}


def _fallback_config(topic: str, grade: GradeLevel) -> dict:
    """LLM failed — pick animation type via keyword matching."""
    t = topic.lower()
    if any(w in t for w in ("神经", "感知机", "激活", "层", "网络", "neural", "cnn", "rnn", "transformer")):
        return {"type": "neural_network", "title": topic, "layers": [2, 4, 3, 1], "showWeights": True}
    if any(w in t for w in ("梯度", "下降", "优化", "损失", "gradient", "sgd", "adam")):
        return {"type": "gradient_descent", "title": topic, "function": "bowl", "learningRate": 0.1}
    if any(w in t for w in ("排序", "冒泡", "选择", "快排", "sort", "bubble")):
        return {"type": "sorting", "title": topic, "algorithm": "bubble", "arraySize": 15}
    if any(w in t for w in ("树", "决策", "tree", "分支")):
        return {"type": "decision_tree", "title": topic, "tree": {"label": topic, "children": [
            {"label": "是", "isLeaf": True, "result": "结果 A"},
            {"label": "否", "isLeaf": True, "result": "结果 B"},
        ]}}
    if any(w in t for w in ("聚类", "簇", "kmeans", "k-means", "分类")):
        return {"type": "kmeans", "title": topic, "clusters": 3, "points": 30}

    # True fallback: generic visualization for non-CS topics
    return {
        "type": "generic", "title": topic, "topicText": topic,
        "particles": 40,
        "message": f"「{topic}」暂无专属动画，正在使用通用可视化。试试 AI 相关话题效果更好！",
    }
