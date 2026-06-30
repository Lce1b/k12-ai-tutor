"""
Quiz Agent — auto-generates practice questions and evaluates answers.
"""

import json
from openai import AsyncOpenAI

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from agents.orchestrator import GradeLevel, build_system_prompt, Intent

client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)


async def generate_quiz(topic: str, grade: GradeLevel, num_questions: int = 3) -> dict:
    """Generate a quiz for the given topic."""
    system = build_system_prompt(grade, Intent.QUIZ)

    prompt = f"""生成{num_questions}道关于「{topic}」的练习题。

返回JSON：
{{
  "questions": [
    {{
      "type": "choice",
      "question": "题目",
      "options": ["A. xxx", "B. xxx", "C. xxx", "D. xxx"],
      "answer": "A",
      "explanation": "解析"
    }}
  ]
}}
"""

    resp = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        temperature=0.8,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )

    try:
        return json.loads(resp.choices[0].message.content)
    except json.JSONDecodeError:
        return {"questions": []}


async def evaluate_answer(question: dict, user_answer: str) -> dict:
    """Evaluate a student's answer."""
    correct = question.get("answer", "").strip().upper()
    user = user_answer.strip().upper()

    is_correct = correct == user
    return {
        "is_correct": is_correct,
        "correct_answer": question.get("answer", ""),
        "explanation": question.get("explanation", "继续加油！"),
        "feedback": "正确！太棒了！" if is_correct else f"答错了~ 正确答案是 {question.get('answer')}，再来试试看！",
    }
