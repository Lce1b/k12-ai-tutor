# K12 智能教学助手 - 前端对接后端 API 文档

## 一、项目背景

这是一个 K12 人工智能通识课教学助手项目，采用前后端分离架构：

- **后端**：Python FastAPI（已完成，运行在 `http://localhost:8000`）
- **前端**：Next.js / React（需要对接后端 API）

本文档用于指导将优化版前端界面与本地 FastAPI 后端进行对接。

---

## 二、后端基础信息

### 2.1 服务地址
```
开发环境：http://localhost:8000
API 前缀：/api
```

### 2.2 健康检查
```
GET /health
返回：{ "status": "ok", "service": "K12 AI Tutor" }
```

### 2.3 CORS 配置
后端已配置允许 `http://localhost:3000` 的跨域请求。

---

## 三、API 接口列表

### 3.1 获取欢迎语和学习统计

**接口**：`GET /api/greeting`

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_id | string | 否 | 会话ID，默认 "default" |
| grade | string | 否 | 学段，默认 "middle" |

**学段枚举值**：
- `primary_low` - 小学低年级
- `primary_high` - 小学高年级
- `middle` - 初中
- `high` - 高中

**返回字段**：
- `greeting` - 欢迎语
- `suggestions` - 推荐学习话题数组（text, action, topic）
- `grade` - 当前学段
- `stats` - 学习统计
  - `total_messages` - 总消息数
  - `total_quizzes` - 总答题数
  - `accuracy` - 正确率（0-1）
  - `topics_studied` - 学习过的话题数
  - `mastered_topics` - 已掌握的话题数组
  - `weak_topics` - 薄弱话题数组
  - `recent_topics` - 最近学习的话题数组
  - `level` - 等级
  - `xp` - 当前经验值
  - `xp_for_next` - 下一级所需经验
  - `streak` - 当前连击数
  - `max_streak` - 最大连击数
  - `top_interests` - 最感兴趣的话题数组

---

### 3.2 主对话接口

**接口**：`POST /api/chat`

**请求体**：
```json
{
  "session_id": "string",
  "message": "string",
  "grade": "string"
}
```

**返回字段**：
- `intent` - 意图分类
- `grade` - 学段
- `topic` - 提取的话题
- `type` - 消息类型：chat / lesson / quiz / code / animation / picture_book
- `message` - 回复消息（Markdown格式）
- `rag_sources` - RAG检索来源（title, score）
- `next_step` - 下一步建议（message, suggestions）

**根据 type 不同，返回额外字段：**

**type = "lesson"（结构化教学）：**
- `lesson.title` - 课程标题
- `lesson.intro` - 引言
- `lesson.sections` - 章节数组（heading, content, example）
- `lesson.knowledge_cards` - 知识点卡片数组（term, definition, icon）
- `lesson.interaction` - 互动提问
- `lesson.summary` - 小结

**type = "quiz"（练习测验）：**
- `quiz.questions` - 题目数组
  - `type` - 题型
  - `question` - 题目
  - `options` - 选项数组
  - `answer` - 正确答案
  - `explanation` - 解析

**type = "code"（编程实践）：**
- `code.title` - 标题
- `code.explanation` - 讲解
- `code.code` - 代码
- `code.expected_output` - 预期输出
- `code.challenge` - 挑战题

**type = "animation"（动画演示）：**
- `animation_html` - HTML动画代码字符串

**type = "picture_book"（绘本故事）：**
- `story.title` - 故事标题
- `story.pages` - 页数组（text, image_prompt）
- `story.moral` - 寓意

---

### 3.3 测验答案评估

**接口**：`POST /api/quiz/eval`

**请求体**：
```json
{
  "question": {},
  "answer": "string",
  "session_id": "string",
  "topic": "string"
}
```

**返回字段**：
- `is_correct` - 是否正确
- `correct_answer` - 正确答案
- `explanation` - 解析
- `feedback` - 反馈文字
- `xp` - 获得的经验值（xp, level, leveled_up, xp_for_next）
- `streak` - 连击信息（streak, max_streak）

---

### 3.4 代码执行

**接口**：`POST /api/code/exec`

**请求体**：
```json
{
  "code": "string"
}
```

**返回字段**：
- `success` - 是否执行成功
- `stdout` - 标准输出
- `stderr` - 错误输出

---

### 3.5 获取代码模板

**接口**：`GET /api/code/templates?grade=middle`

**返回**：`{ templates: [] }`

---

### 3.6 生成并下载 PPT 课件

**接口**：`POST /api/resources/ppt`

**请求体**：
```json
{
  "topic": "string",
  "grade": "string",
  "session_id": "string"
}
```

**返回**：二进制 PPTX 文件流，直接触发下载

---

### 3.7 生成并下载 Word 文档

**接口**：`POST /api/resources/word`

**请求体**：同 PPT 接口

**返回**：二进制 DOCX 文件流

---

### 3.8 PPT 深度解析

**接口**：`POST /api/resources/ppt/deep-parse`

**请求方式**：`multipart/form-data`

**表单字段**：
- `file` - PPT文件（必填）
- `grade` - 学段（可选，默认"middle"）
- `auto_index` - 是否自动索引（可选，默认true）

**主要返回字段**：
- `filename` - 文件名
- `total_slides` - 总幻灯片数
- `indexed_count` - 索引到知识库的条目数
- `error` - 错误信息（如果有）
- `course_meta` - 课程元信息
- `slide_analysis` - 每页幻灯片分析数组
- `knowledge_graph` - 知识图谱
- `key_concepts` - 核心概念数组
- `generated_quiz` - 生成的测验题数组
- `teaching_suggestions` - 教学建议
- `slides_raw` - 原始幻灯片信息
- `image_stats` - 图片统计信息

---

### 3.9 获取课程大纲

**接口**：`GET /api/curriculum`

**返回**：完整的 K12 AI 课程大纲

---

### 3.10 获取学习统计

**接口**：`GET /api/stats/{session_id}`

**返回**：同 greeting 接口中的 stats 字段

---

### 3.11 会话管理

- 获取会话历史：`GET /api/session/{session_id}`
- 清除会话：`DELETE /api/session/{session_id}`

---

## 四、前端对接步骤

### 4.1 配置 API 基础地址

**方案一：Next.js 代理（推荐）**

在 `next.config.js` 中配置：
```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8000/api/:path*',
    },
  ];
}
```

**方案二：直接配置环境变量**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 4.2 封装 API 调用

创建 `src/lib/api.ts`，封装所有 API 函数：
- `fetchGreeting(sessionId, grade)`
- `sendMessage({ session_id, message, grade })`
- `evaluateQuiz({ question, answer, session_id, topic })`
- `executeCode({ code })`
- `deepParsePpt(formData)`
- `downloadResource(type, topic, grade, sessionId)`

### 4.3 替换 Mock 数据

逐个模块替换为真实 API 调用：

1. **欢迎语** - 页面加载时调用 fetchGreeting
2. **对话发送** - 发送消息时调用 sendMessage
3. **测验答题** - 提交答案时调用 evaluateQuiz
4. **代码运行** - 点击运行按钮时调用 executeCode
5. **PPT解析** - 上传文件时调用 deepParsePpt
6. **资源下载** - 点击下载时调用 downloadResource

### 4.4 消息类型渲染

根据返回的 `type` 字段渲染不同组件：
- `chat` → Markdown 文本
- `lesson` → 教学卡片组件
- `quiz` → 测验卡片组件
- `code` → 代码块组件（带运行按钮）
- `animation` → iframe 或 dangerouslySetInnerHTML
- `picture_book` → 绘本卡片组件

---

## 五、注意事项

### 5.1 会话管理
- 每个浏览器生成唯一 session_id（可存在 localStorage）
- 格式建议：`session_${timestamp}_${random}`
- 切换学段建议开启新会话

### 5.2 错误处理
- 所有 API 调用都需要 try-catch
- 网络错误显示友好提示
- 不要把后端错误堆栈直接展示给用户

### 5.3 加载状态
- 对话请求：显示打字机效果或加载动画
- PPT上传：显示进度/解析中状态
- 资源下载：显示生成中提示

### 5.4 动画渲染
- `animation_html` 是完整的 HTML 字符串
- 可以用 iframe 或 dangerouslySetInnerHTML 渲染
- 注意样式隔离

---

## 六、本地项目参考

本地已有完整实现，可直接参考：

**后端**：`backend/`
- 入口：`backend/main.py`
- 路由：`backend/routers/chat.py`

**前端**：`frontend/src/app/`
- API封装：`frontend/src/app/lib/api.ts`
- 主页面：`frontend/src/app/page.tsx`
- 组件：`frontend/src/app/components/`

**启动命令**：
```bash
# 后端
cd backend && pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 前端
cd frontend && npm install
npm run dev
```

---

## 七、对接检查清单

- [ ] API 基础地址配置正确
- [ ] 欢迎语接口对接完成
- [ ] 主对话接口对接完成
- [ ] 6种消息类型正确渲染
- [ ] 测验答题评分对接完成
- [ ] 代码执行功能对接完成
- [ ] PPT上传解析对接完成
- [ ] PPT/Word资源下载对接完成
- [ ] 学习统计数据对接完成
- [ ] 错误处理和加载状态完善
- [ ] 深色/浅色主题正常
- [ ] 响应式布局正常
- [ ] 会话历史功能正常
