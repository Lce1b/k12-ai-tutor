# K12 智能教学助手

多模态K12人工智能通识课教学助手对话智能体，面向浙江省大学生人工智能竞赛"揭榜挂帅赛"（JBGS-2026-02）。

## 功能概览

- **4学段自适应**：小学低年级 / 小学高年级 / 初中 / 高中，自动调整知识深度和交互风格
- **6种多模态交互**：对话问答、结构化教学、动画演示、绘本故事、编程实践、游戏化练习
- **教学资源生成**：一键生成PPT课件和Word教学文档
- **个性化学习**：学习历史追踪、答题正确率统计、掌握/薄弱知识点分析
- **智能课程大纲**：6大模块30节课的完整K12 AI课程体系
- **RAG知识库**：226条分级教学内容，覆盖6大AI主题

## 系统架构

```
浏览器 (Next.js 14)         后端 (FastAPI)              外部服务
  │                            │                           │
  ├── Chat UI                  ├── Orchestrator Agent      │
  ├── GradeSelector            ├── Dialogue Agent ────────→ LLM API
  ├── QuizCard                 ├── Teaching Agent          │
  ├── CodeBlock                ├── Animation Agent         │
  ├── AnimationViewer          ├── Quiz Agent              │
  ├── PictureBookCard          ├── Coding Agent            │
  └── StatsPanel               ├── PictureBook Agent       │
                                ├── Resources Agent ──────→ LLM API
                                ├── RAG Engine ───────────→ ChromaDB
                                └── History Manager ──────→ JSON Files
```

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | Next.js 14 + TypeScript + TailwindCSS | 响应式单页应用 |
| 后端 | Python FastAPI | 异步REST API |
| LLM | OpenAI兼容API | 可切换任意兼容模型 |
| 向量库 | ChromaDB + Sentence-Transformers | 本地向量检索 |
| 文档生成 | python-pptx / python-docx | PPT/Word导出（无依赖亦可运行） |

## 一键部署

### 环境要求

- Python 3.11+
- Node.js 20+
- LLM API Key（OpenAI兼容接口）

### 1. 克隆项目

```bash
git clone <repo-url> k12-ai-tutor
cd k12-ai-tutor
```

### 2. 启动后端

```bash
cd backend

# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置API密钥
cp .env.example .env
# 编辑 .env 文件，填入 LLM_API_KEY

# 启动后端（开发模式）
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

后端启动后访问 http://localhost:8000/health 确认运行正常。

### 3. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端启动后访问 http://localhost:3000 。

### 4. 生产部署

```bash
# 前端构建
cd frontend && npm run build && npm start

# 后端（使用gunicorn）
cd backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

## 配置说明

`backend/.env` 文件：

```env
# LLM API配置（必填）
LLM_API_KEY=sk-your-api-key          # API密钥
LLM_BASE_URL=https://api.openai.com/v1  # API地址，兼容OpenAI格式即可
LLM_MODEL=gpt-4o-mini                # 模型名称

# 向量模型（可选）
EMBED_MODEL=all-MiniLM-L6-v2

# 数据存储（可选）
CHROMA_PATH=./chroma_db
```

支持的LLM服务商（OpenAI兼容接口即可）：
- OpenAI (gpt-4o-mini, gpt-4o)
- DeepSeek (deepseek-chat)
- 通义千问 (qwen-turbo)
- 智谱GLM (glm-4)
- Moonshot (moonshot-v1)
- 任何兼容 `/v1/chat/completions` 格式的服务

## API文档

启动后端后访问 http://localhost:8000/docs 查看Swagger文档。

### 主要端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/greeting` | GET | 生成欢迎语和学习建议 |
| `/api/chat` | POST | 主对话接口（调度7个Agent） |
| `/api/quiz/eval` | POST | 评估测验答案 |
| `/api/code/exec` | POST | 执行Python代码 |
| `/api/code/templates` | GET | 获取预置代码模板 |
| `/api/resources/ppt` | POST | 生成下载教学PPT |
| `/api/resources/word` | POST | 生成下载教学文档 |
| `/api/curriculum` | GET | 获取课程大纲 |
| `/api/stats/{session_id}` | GET | 获取学习统计 |
| `/api/session/{session_id}` | GET/DELETE | 会话管理 |

## 项目结构

```
k12-ai-tutor/
├── README.md
├── PLAN.md
├── backend/
│   ├── main.py              # FastAPI入口
│   ├── config.py             # 配置管理
│   ├── requirements.txt      # Python依赖
│   ├── .env.example          # 环境变量模板
│   ├── agents/               # Agent模块
│   │   ├── orchestrator.py   # 意图路由 + 学段自适应
│   │   ├── dialogue.py       # 对话Agent
│   │   ├── teaching.py       # 微课教学Agent
│   │   ├── animation.py      # 动画生成Agent
│   │   ├── quiz.py           # 练习测验Agent
│   │   ├── coding.py         # 编程教学Agent
│   │   ├── picturebook.py    # 绘本故事Agent
│   │   └── resources.py      # PPT/Word生成Agent
│   ├── knowledge/            # 知识库（226条 + 课程大纲）
│   │   ├── curriculum.json
│   │   ├── ai_basics.json
│   │   ├── data_algorithms.json
│   │   ├── machine_learning.json
│   │   ├── computer_vision.json
│   │   ├── nlp.json
│   │   └── ai_ethics.json
│   ├── routers/              # API路由
│   │   └── chat.py
│   └── utils/                # 工具模块
│       ├── rag.py            # RAG向量检索引擎
│       └── history.py        # 学习历史追踪
└── frontend/
    └── src/app/
        ├── page.tsx           # 主Chat页面
        ├── layout.tsx         # 根布局
        ├── globals.css        # 全局样式
        ├── lib/api.ts         # API客户端
        └── components/
            ├── ChatMessage.tsx
            ├── GradeSelector.tsx
            ├── QuizCard.tsx
            ├── CodeBlock.tsx
            └── MarkdownRenderer.tsx
```

## 多Agent编排策略

用户消息 → Orchestrator（意图分类） → 调度到对应Agent：

| 意图 | Agent | 输出类型 |
|------|-------|----------|
| 自由问答 | Dialogue | Markdown文本 + RAG增强 |
| 正式上课 | Teaching | 结构化微课（引入→讲解→互动→小结） |
| 动画演示 | Animation | HTML5交互动画 |
| 绘本故事 | PictureBook | 绘本故事卡片 |
| 编程实践 | Coding | Python代码 + 沙箱执行 |
| 练习测验 | Quiz | 互动选择题 + 即时批改 |

## License

本作品仅供参赛使用。
