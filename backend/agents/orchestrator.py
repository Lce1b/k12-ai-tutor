"""
K12 AI Teaching Assistant — Orchestrator Agent.
Routes user intent to the appropriate sub-agent.
"""

import json
import re
from enum import Enum

import httpx
from openai import AsyncOpenAI

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL

client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL, timeout=httpx.Timeout(120.0, connect=10.0))


class Intent(str, Enum):
    CHAT = "chat"
    TEACH = "teach"
    ANIMATE = "animate"
    PICTURE_BOOK = "picture_book"
    CODE = "code"
    QUIZ = "quiz"


class GradeLevel(str, Enum):
    P1 = "primary_low"    # 小学低年级 1-3
    P2 = "primary_high"   # 小学高年级 4-6
    M = "middle"          # 初中
    H = "high"            # 高中


GRADE_PROFILES = {
    GradeLevel.P1: {
        "name": "小学低年级",
        "age_range": "6-9岁",
        "tone": "温暖亲切的大姐姐/大哥哥，用简单短句，多用比喻和故事",
        "max_tokens": 800,
        "style": "对话中穿插emoji，用绘本故事和游戏来引导学习",
    },
    GradeLevel.P2: {
        "name": "小学高年级",
        "age_range": "9-12岁",
        "tone": "有趣又博学的老师，用生活例子解释概念，鼓励动手尝试",
        "max_tokens": 1200,
        "style": "适度使用专业术语但会解释，用互动问答和简单实验演示",
    },
    GradeLevel.M: {
        "name": "初中",
        "age_range": "12-15岁",
        "tone": "知识丰富的导师，用逻辑推理展开概念，连接学科知识",
        "max_tokens": 1600,
        "style": "引入基础数学和算法思想，结合Scratch/Python实践",
    },
    GradeLevel.H: {
        "name": "高中",
        "age_range": "15-18岁",
        "tone": "专业的AI研究者视角，鼓励批判性思考和数学理解",
        "max_tokens": 2000,
        "style": "数学公式+代码实现+论文思想，项目式深度学习",
    },
}

INTENT_PROMPT = """你是一个意图分类器。根据用户消息，判断意图类型。
只返回JSON，不要其他文字。

意图类型：
- chat: 自由问答、闲聊、问概念
- teach: 请求正式上课、系统学习某个主题
- animate: 请求动画演示、可视化解释
- picture_book: 请求绘本故事
- code: 请求编程实践、代码例子、写/运行代码
- quiz: 请求练习题、测验

用户消息: {message}

返回格式: {{"intent": "chat", "confidence": 0.95}}"""


def build_system_prompt(grade: GradeLevel, intent: Intent) -> str:
    profile = GRADE_PROFILES[grade]

    base = f"""你是K12 AI通识课教学助手，服务{profile['name']}学生（{profile['age_range']}）。

## 你的角色
{profile['tone']}

## 交互风格
{profile['style']}

## 核心要求
1. 严格适配{profile['name']}学生的认知水平
2. 用中文交流，专业术语要解释
3. 鼓励学生思考和提问
4. 内容积极健康，适合学生年龄
5. 涉及编程时使用Python
6. 回复控制在{profile['max_tokens']}字以内
"""

    intent_addons = {
        Intent.CHAT: "\n## 当前模式：自由问答\n耐心回答学生问题，引导学生探索AI知识。",
        Intent.TEACH: "\n## 当前模式：正式授课\n按课程结构讲授，包含：引入→概念讲解→例子→互动提问→小结。",
        Intent.ANIMATE: "\n## 当前模式：动画演示\n用生动的方式解释概念，生成可视化的HTML动画代码供学生观看。",
        Intent.PICTURE_BOOK: "\n## 当前模式：绘本故事\n把知识点编成有趣的故事，配合画面感描述，适合阅读。",
        Intent.CODE: "\n## 当前模式：编程实践\n提供代码示例和练习，引导学生动手写代码，解释每段代码的含义。",
        Intent.QUIZ: "\n## 当前模式：练习测验\n出题考察学生对知识点的掌握，提供即时反馈和鼓励。",
    }

    return base + intent_addons.get(intent, "")


async def classify_intent(message: str) -> Intent:
    """Use LLM to classify user intent."""
    try:
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": INTENT_PROMPT.format(message=message)}],
            temperature=0,
            max_tokens=100,
        )
        text = resp.choices[0].message.content.strip()
        data = json.loads(text)
        return Intent(data.get("intent", "chat"))
    except Exception:
        # Fallback: keyword matching
        return _keyword_intent(message)


def _keyword_intent(message: str) -> Intent:
    m = message.lower()
    if any(w in m for w in ["动画", "演示", "可视化", "展示一下", "动态"]):
        return Intent.ANIMATE
    if any(w in m for w in ["绘本", "故事", "讲故事"]):
        return Intent.PICTURE_BOOK
    if any(w in m for w in ["代码", "编程", "写程序", "python", "运行", "debug"]):
        return Intent.CODE
    if any(w in m for w in ["练习", "测验", "考题", "考考我", "测试", "题目"]):
        return Intent.QUIZ
    if any(w in m for w in ["上课", "学习", "教我", "课程", "讲解", "讲讲"]):
        return Intent.TEACH
    return Intent.CHAT


def extract_topic(message: str) -> str:
    """Extract the main topic from user message."""
    topics = [
        "神经网络", "深度学习", "机器学习", "算法", "排序",
        "图像识别", "人脸识别", "语音识别", "自然语言处理",
        "强化学习", "GAN", "Transformer", "CNN", "RNN",
        "数据", "特征", "分类", "回归", "聚类",
        "AI伦理", "偏见", "隐私", "安全",
        "Python", "变量", "循环", "函数", "条件",
        "感知机", "激活函数", "梯度下降", "反向传播",
        "过拟合", "欠拟合", "正则化",
    ]
    found = [t for t in topics if t in message]
    return found[0] if found else message[:30]


GREETING_PROMPT = """你是一个K12 AI教学助手，正在欢迎一位{grade_name}学生（{age_range}）开始学习。

请生成一段温暖的欢迎语和3个学习建议，让学生选择想学什么。

返回JSON：
{{
  "greeting": "欢迎语（2-3句话，温暖亲切）",
  "suggestions": [
    {{"text": "建议1（简短，10字以内）", "action": "teach", "topic": "具体学习主题"}},
    {{"text": "建议2", "action": "chat", "topic": "提问主题"}},
    {{"text": "建议3", "action": "animate", "topic": "动画演示主题"}}
  ]
}}

{grade_name}学生的风格：{style}"""


async def generate_greeting(grade: GradeLevel) -> dict:
    """Generate a proactive greeting with learning suggestions."""
    profile = GRADE_PROFILES[grade]
    prompt = GREETING_PROMPT.format(
        grade_name=profile["name"],
        age_range=profile["age_range"],
        style=profile["style"],
    )
    try:
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=500,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {
            "greeting": f"你好！欢迎来到AI学习之旅。我是你的专属AI老师，准备好了吗？",
            "suggestions": [
                {"text": "什么是人工智能", "action": "teach", "topic": "什么是人工智能"},
                {"text": "AI能做什么", "action": "chat", "topic": "AI的应用"},
                {"text": "做个练习", "action": "quiz", "topic": "AI基础"},
            ],
        }


NEXT_STEP_PROMPT = """学生刚完成了一个关于「{topic}」的{activity}。请建议下一步学习方向。

学生水平：{grade_name}（{age_range}）

返回JSON：
{{
  "message": "过度语（1句话，鼓励+引导下一步）",
  "suggestions": [
    {{"text": "建议1（简短）", "action": "teach|quiz|animate|code|chat", "topic": "主题"}},
    {{"text": "建议2", "action": "teach|quiz|animate|code|chat", "topic": "主题"}}
  ]
}}"""


async def suggest_next_step(topic: str, intent: Intent, grade: GradeLevel) -> dict:
    """After a lesson/quiz, suggest the next learning step."""
    profile = GRADE_PROFILES[grade]
    activity_map = {
        Intent.TEACH: "课程学习",
        Intent.QUIZ: "练习测验",
        Intent.ANIMATE: "动画演示",
        Intent.CODE: "编程实践",
        Intent.CHAT: "问答讨论",
        Intent.PICTURE_BOOK: "绘本阅读",
    }
    prompt = NEXT_STEP_PROMPT.format(
        topic=topic,
        activity=activity_map.get(intent, "学习活动"),
        grade_name=profile["name"],
        age_range=profile["age_range"],
    )
    try:
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=400,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)
    except Exception:
        return {"message": "学得不错！要不要继续探索？", "suggestions": []}
