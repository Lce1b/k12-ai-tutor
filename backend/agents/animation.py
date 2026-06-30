"""
Animation Agent — generates HTML5 educational animations for AI concepts.
"""

import re
from openai import AsyncOpenAI

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from agents.orchestrator import GradeLevel

client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

ANIMATION_PROMPT = """你是一个教育动画生成器。为{grade_name}学生生成讲解「{topic}」的HTML动画。

## 学生水平
{grade_desc}

## 要求
1. 使用纯HTML+CSS+JS（无需外部依赖）
2. 动画要直观展示概念的运作原理
3. 包含标题、动画区域、控制按钮（开始/暂停/重置）
4. 添加简洁的中文标注
5. 适配移动端，canvas宽度最大600px
6. 代码写在```html代码块中
7. 文字解释和标注的难度要适配{grade_name}学生的认知水平

## 动画创意方向
- 排序算法：彩色柱状图交换动画
- 神经网络：节点连线+信号流动
- 图像识别：像素网格+卷积扫描
- 梯度下降：小球在曲线上滚到最低点
- 决策树：树形分叉+数据流动

只返回HTML代码，不要额外解释。"""

GRADE_ANIMATION_DESC = {
    GradeLevel.P1: ("小学低年级（6-9岁）", "使用可爱的颜色和大字体，用比喻和故事化方式展示，避免数学公式"),
    GradeLevel.P2: ("小学高年级（9-12岁）", "增加简单的数字和流程图，用生活例子解释概念"),
    GradeLevel.M: ("初中（12-15岁）", "可以展示基础数学关系和逻辑流程，引入变量和循环的可视化"),
    GradeLevel.H: ("高中（15-18岁）", "可以展示数学公式、算法伪代码、数据结构，动画要有学术深度"),
}


async def generate_animation(topic: str, grade: GradeLevel = GradeLevel.M) -> str:
    """Generate an HTML5 educational animation for a topic, adapted to grade level."""
    grade_name, grade_desc = GRADE_ANIMATION_DESC.get(
        grade, GRADE_ANIMATION_DESC[GradeLevel.M]
    )

    prompt = ANIMATION_PROMPT.format(
        topic=topic, grade_name=grade_name, grade_desc=grade_desc
    )

    resp = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
        max_tokens=4000,
    )

    text = resp.choices[0].message.content

    # Extract HTML from code block
    match = re.search(r"```html?\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1)
    match = re.search(r"```\n(.*?)```", text, re.DOTALL)
    if match:
        return match.group(1)
    return text
