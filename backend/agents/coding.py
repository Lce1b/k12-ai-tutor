"""
Coding Agent — Python code teaching + sandbox execution + pre-built templates.
"""

import asyncio
import json
import os
import re
import subprocess
import tempfile
import httpx
from openai import AsyncOpenAI

from config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from agents.orchestrator import GradeLevel, build_system_prompt, Intent

client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL, timeout=httpx.Timeout(120.0, connect=10.0))

SANDBOX_TIMEOUT = 10

BLOCKED_MODULES = [
    "os", "subprocess", "shutil", "sys", "ctypes", "socket",
    "http", "urllib", "requests", "ftplib", "telnetlib",
    "pickle", "marshal", "multiprocessing", "threading",
    "signal", "atexit", "importlib", "inspect", "traceback",
    "code", "codeop", "pty", "fcntl", "posix", "pwd", "grp",
    "crypt", "spwd", "termios", "tty", "readline",
]

CODE_CHECK_RE = re.compile(r"\b(" + "|".join(BLOCKED_MODULES) + r")\b")

# Pre-built code templates for different topics / grade levels
CODE_TEMPLATES = {
    "bubble_sort": {
        "title": "冒泡排序可视化",
        "explanation": "冒泡排序就像水里的气泡，轻的（小的）往上浮。每轮比较相邻两个数，把大的往后挪。",
        "code": '''def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

# 试试修改下面的列表！
numbers = [64, 34, 25, 12, 22, 11, 90]
print("排序前:", numbers)
print("排序后:", bubble_sort(numbers.copy()))''',
        "expected_output": "排序前: [64, 34, 25, 12, 22, 11, 90]\n排序后: [11, 12, 22, 25, 34, 64, 90]",
        "challenge": "修改代码，让它从大到小排序（降序）",
        "grades": ["primary_high", "middle", "high"],
    },
    "simple_neural": {
        "title": "最简单的神经网络——一个神经元",
        "explanation": "一个神经元接收输入、乘以权重、相加、经过激活函数输出。这里实现一个能学习AND逻辑的感知机。",
        "code": '''import math

def sigmoid(x):
    return 1 / (1 + math.exp(-x))

class Neuron:
    def __init__(self):
        # 初始化权重和偏置
        self.w1 = 0.5
        self.w2 = 0.5
        self.bias = -0.5

    def forward(self, x1, x2):
        total = self.w1 * x1 + self.w2 * x2 + self.bias
        return sigmoid(total)

    def train(self, data, epochs=1000, lr=0.1):
        for _ in range(epochs):
            for x1, x2, target in data:
                output = self.forward(x1, x2)
                error = target - output
                self.w1 += lr * error * x1
                self.w2 += lr * error * x2
                self.bias += lr * error

# AND逻辑：两个都是1才输出1
and_data = [(0,0,0), (0,1,0), (1,0,0), (1,1,1)]
n = Neuron()
n.train(and_data, epochs=2000)
print("AND(0,0) =", round(n.forward(0, 0)))
print("AND(0,1) =", round(n.forward(0, 1)))
print("AND(1,0) =", round(n.forward(1, 0)))
print("AND(1,1) =", round(n.forward(1, 1)))''',
        "expected_output": "AND(0,0) = 0\nAND(0,1) = 0\nAND(1,0) = 0\nAND(1,1) = 1",
        "challenge": "把训练数据改成OR逻辑，看看神经元能不能学会！",
        "grades": ["middle", "high"],
    },
    "image_classifier": {
        "title": "KNN图像分类器",
        "explanation": "K近邻算法：看一张新图片，找到训练集中最相似的K张，投票决定它是什么。这里用简单的数字特征模拟。",
        "code": '''from collections import Counter
import math

def euclidean(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

def knn_predict(train_data, train_labels, test_point, k=3):
    distances = []
    for i, point in enumerate(train_data):
        d = euclidean(point, test_point)
        distances.append((d, train_labels[i]))
    distances.sort()
    neighbors = [label for _, label in distances[:k]]
    return Counter(neighbors).most_common(1)[0][0]

# 模拟训练数据：[长, 宽] -> 水果类别
X_train = [[5, 5], [4, 4], [6, 5],    # 苹果
           [8, 2], [9, 3], [7, 2]]     # 香蕉
y_train = ["苹果", "苹果", "苹果", "香蕉", "香蕉", "香蕉"]

# 新水果：[长7, 宽3] 是什么？
new_fruit = [7, 3]
pred = knn_predict(X_train, y_train, new_fruit, k=3)
print(f"新水果{new_fruit}被分类为: {pred}")

# 试试更多新数据!
test = [[3, 4], [8, 1]]
for t in test:
    print(f"{t} -> {knn_predict(X_train, y_train, t, k=3)}")''',
        "expected_output": "新水果[7, 3]被分类为: 香蕉\n[3, 4] -> 苹果\n[8, 1] -> 香蕉",
        "challenge": "添加更多训练数据，试试K=1和K=5的预测结果有什么不同",
        "grades": ["middle", "high"],
    },
    "gradient_descent": {
        "title": "梯度下降——找到山谷最低点",
        "explanation": "梯度下降是机器学习的核心优化算法。想象你在雾中的山上，每次朝最陡的下坡方向走一步，最终到达山谷。",
        "code": '''import math

# 目标函数: y = (x-3)^2 + 2  (最小值在 x=3, y=2)
def f(x):
    return (x - 3) ** 2 + 2

def gradient(x):
    return 2 * (x - 3)  # f的导数

# 梯度下降
x = 10.0          # 从x=10开始
lr = 0.1          # 学习率（步长）
history = [x]

for step in range(50):
    grad = gradient(x)
    x = x - lr * grad
    history.append(x)
    if abs(grad) < 0.001:
        break

print(f"起始位置: x={history[0]:.1f}, f(x)={f(history[0]):.1f}")
print(f"最终位置: x={x:.4f}, f(x)={f(x):.4f}")
print(f"理论最小值: x=3, f(x)=2")
print(f"下降步数: {len(history)-1}")
print(f"前5步: {[round(h,2) for h in history[:5]]}")''',
        "expected_output": "起始位置: x=10.0, f(x)=51.0\n最终位置: x=3.0000, f(x)=2.0000\n理论最小值: x=3, f(x)=2\n下降步数: ~45\n前5步: [10.0, 8.6, 7.48, ...]",
        "challenge": "把学习率改成0.01和0.5，观察收敛速度的差异。试试从x=-5开始会怎样？",
        "grades": ["middle", "high"],
    },
    "decision_tree": {
        "title": "简单决策树——猜动物游戏",
        "explanation": "决策树就像玩20个问题游戏，每个节点问一个是/否问题。这里实现一个迷你决策树来猜动物。",
        "code": '''class TreeNode:
    def __init__(self, question=None, yes=None, no=None, answer=None):
        self.question = question  # 要问的问题
        self.yes = yes            # "是"走这边
        self.no = no              # "否"走这边
        self.answer = answer      # 叶子节点的答案

# 构建一个猜动物的决策树
tree = TreeNode(
    question="它会飞吗？",
    yes=TreeNode(question="它吃鱼吗？",
                 yes=TreeNode(answer="老鹰"),
                 no=TreeNode(answer="麻雀")),
    no=TreeNode(question="它生活在水里吗？",
                yes=TreeNode(answer="金鱼"),
                no=TreeNode(question="它有四条腿吗？",
                            yes=TreeNode(answer="小狗"),
                            no=TreeNode(answer="蛇")))
)

def guess(node):
    if node.answer:
        print(f"我猜是：{node.answer}！")
        return
    ans = input(f"{node.question} (是/否): ")
    if ans.strip() in ["是", "yes", "y"]:
        guess(node.yes)
    else:
        guess(node.no)

print("心里想一个动物，我来猜！")
print("可选：老鹰、麻雀、金鱼、小狗、蛇")
guess(tree)''',
        "expected_output": "心里想一个动物，我来猜！\n可选：老鹰、麻雀、金鱼、小狗、蛇\n它会飞吗？ (是/否): 否\n它生活在水里吗？ (是/否): 否\n它有四条腿吗？ (是/否): 是\n我猜是：小狗！",
        "challenge": "添加更多动物（比如猫、鲸鱼），扩展决策树让游戏更有趣",
        "grades": ["primary_high", "middle", "high"],
    },
}


def get_code_templates(grade: str = None) -> list[dict]:
    """Return pre-built code templates, optionally filtered by grade."""
    result = []
    for key, tmpl in CODE_TEMPLATES.items():
        if grade is None or grade in tmpl["grades"]:
            result.append({
                "id": key,
                "title": tmpl["title"],
                "explanation": tmpl["explanation"],
                "challenge": tmpl["challenge"],
            })
    return result


def get_template_by_id(template_id: str) -> dict | None:
    """Get a specific code template with full code."""
    tmpl = CODE_TEMPLATES.get(template_id)
    if tmpl is None:
        return None
    return {
        "id": template_id,
        "title": tmpl["title"],
        "explanation": tmpl["explanation"],
        "code": tmpl["code"],
        "expected_output": tmpl["expected_output"],
        "challenge": tmpl["challenge"],
    }


async def generate_code_example(topic: str, grade: GradeLevel) -> dict:
    """Generate a Python code example for the topic."""
    system = build_system_prompt(grade, Intent.CODE)

    prompt = f"""为「{topic}」生成一个Python教学代码示例。

返回JSON：
{{
  "title": "代码示例标题",
  "explanation": "这段代码做什么",
  "code": "Python代码（可直接运行）",
  "expected_output": "预期输出",
  "challenge": "一个小挑战：让学生修改代码实现新功能"
}}
"""

    resp = await client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )

    try:
        return json.loads(resp.choices[0].message.content)
    except (json.JSONDecodeError, AttributeError):
        return {
            "title": topic,
            "explanation": "Python代码示例",
            "code": f"# 关于 {topic} 的Python代码\nprint('Hello AI!')",
            "expected_output": "Hello AI!",
            "challenge": "尝试修改print内容",
        }


async def execute_code(code: str) -> dict:
    """Execute student Python code in a restricted sandbox.

    Blocks dangerous module imports for safety. This is a best-effort
    sandbox for a competition demo — use Docker for production.
    """
    # Safety check: scan for dangerous imports before execution
    if CODE_CHECK_RE.search(code):
        return {
            "success": False,
            "stdout": "",
            "stderr": "安全限制：代码包含不允许的模块。请使用安全的Python内置功能。",
        }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(code)
        tmp_path = f.name

    try:
        proc = await asyncio.create_subprocess_exec(
            "python", "-I", tmp_path,  # -I = isolated mode (ignore PYTHONPATH, user site-packages)
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=SANDBOX_TIMEOUT
        )
        return {
            "success": proc.returncode == 0,
            "stdout": stdout.decode("utf-8", errors="replace")[:2000],
            "stderr": stderr.decode("utf-8", errors="replace")[:2000],
        }
    except asyncio.TimeoutError:
        return {"success": False, "stdout": "", "stderr": "代码执行超时（>10秒）"}
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
