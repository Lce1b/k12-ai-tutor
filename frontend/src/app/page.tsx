"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "./components/ChatMessage";
import type { MessageData } from "./components/ChatMessage";
import GradeSelector from "./components/GradeSelector";
import PptParser from "./components/PptParser";
import { sendMessage, fetchGreeting, downloadResource } from "./lib/api";
import type { GreetingResponse, NextStep } from "./lib/api";

/* ===== Types ===== */

type Grade = "primary_low" | "primary_high" | "middle" | "high";

interface Session {
  id: string;
  title: string;
  grade: Grade;
  messages: MessageData[];
  createdAt: number;
}

/* ===== Constants ===== */

const GRADE_LABELS: Record<Grade, string> = {
  primary_low: "小学低年级",
  primary_high: "小学高年级",
  middle: "初中",
  high: "高中",
};

const TOPIC_SUGGESTIONS: Record<Grade, string[]> = {
  primary_low: ["什么是人工智能", "AI会和我们做朋友吗", "身边的AI魔法", "计算机怎么认识图片"],
  primary_high: ["数据是什么", "算法就像做菜的步骤", "AI如何识别猫和狗", "神经网络的小秘密"],
  middle: ["机器学习入门", "图像识别原理", "自然语言处理", "AI伦理与偏见"],
  high: ["梯度下降可视化", "CNN卷积原理", "Transformer注意力机制", "强化学习与游戏AI"],
};

const QUICK_ACTIONS = [
  { label: "动画演示", icon: "", prompt: "用动画演示一下神经网络是怎么工作的" },
  { label: "做练习题", icon: "", prompt: "给我出几道练习题测验一下" },
  { label: "写代码", icon: "", prompt: "写一个Python代码例子教我" },
  { label: "绘本故事", icon: "", prompt: "给我讲一个关于AI的绘本故事" },
  { label: "下载课件", icon: "", prompt: "", isResource: true },
];

/* ===== Helpers ===== */

let idCounter = 0;
function uid(): string {
  return `msg_${Date.now()}_${++idCounter}`;
}

/* ===== Component ===== */

export default function Home() {
  /* ---------- State ---------- */
  const [grade, setGrade] = useState<Grade>("primary_low");
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionTitle, setSessionTitle] = useState("新的对话");
  const [darkMode, setDarkMode] = useState(false);
  const [greeting, setGreeting] = useState<GreetingResponse | null>(null);
  const [nextSteps, setNextSteps] = useState<NextStep | null>(null);
  const [showPptParser, setShowPptParser] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ---------- Fetch greeting on new session ---------- */
  useEffect(() => {
    fetchGreeting(sessionId, grade)
      .then(setGreeting)
      .catch(() => {});
  }, [sessionId, grade]);

  /* ---------- Dark mode init ---------- */
  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("k12-theme", next ? "dark" : "light");
  };

  /* ---------- Auto scroll ---------- */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /* ---------- Send message ---------- */
  const handleSend = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || isLoading) return;

      const userMsg: MessageData = {
        id: uid(),
        role: "user",
        content,
        type: "chat",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsLoading(true);

      // Auto-title on first message
      if (messages.length === 0) {
        setSessionTitle(content.slice(0, 28) + (content.length > 28 ? "…" : ""));
      }

      try {
        const res = await sendMessage({
          session_id: sessionId,
          message: content,
          grade,
        });

        const assistantMsg: MessageData = {
          id: uid(),
          role: "assistant",
          content: res.message || "",
          type: res.type || "chat",
          lesson: res.lesson
            ? {
                title: res.lesson.title,
                content: res.lesson.intro + "\n\n" +
                  res.lesson.sections.map((s: {heading: string, content: string, example: string}) =>
                    `**${s.heading}**\n${s.content}\n*例子：${s.example}*`
                  ).join("\n\n") +
                  "\n\n**互动提问：**" + res.lesson.interaction +
                  "\n\n**小结：**" + res.lesson.summary,
                keyPoints: res.lesson.knowledge_cards.map((c: {term: string, definition: string}) => `${c.term}: ${c.definition}`),
              }
            : undefined,
          quiz: res.quiz
            ? res.quiz
            : undefined,
          code: res.code || undefined,
          animationHtml: res.animation_html,
          story: res.story || undefined,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setNextSteps(res.next_step || null);
      } catch {
        const errMsg: MessageData = {
          id: uid(),
          role: "assistant",
          content: "抱歉，我遇到了一些问题，请稍后再试。如果问题持续存在，请检查网络连接。",
          type: "chat",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId, grade, messages.length],
  );

  /* ---------- Handlers ---------- */
  const handleQuickAction = (prompt: string) => {
    handleSend(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const handleNewSession = () => {
    setMessages([]);
    setSessionTitle("新的对话");
    setNextSteps(null);
    fetchGreeting(sessionId, grade).then(setGreeting).catch(() => {});
  };

  const handleGreetingClick = (text: string) => {
    handleSend(text);
  };

  const handleSessionClick = (s: Session) => {
    setMessages(s.messages);
    setSessionTitle(s.title);
    setGrade(s.grade);
  };

  const handleGradeChange = (g: string) => {
    setGrade(g as Grade);
  };

  /* Save session when messages change (new response received) */
  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === sessionId);
        const updated: Session = {
          id: sessionId,
          title: sessionTitle,
          grade,
          messages,
          createdAt: existing?.createdAt ?? Date.now(),
        };
        if (existing) {
          return prev.map((s) => (s.id === sessionId ? updated : s));
        }
        return [updated, ...prev];
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [messages, sessionId, sessionTitle, grade]);

  /* ---------- Render ---------- */
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      {/* ===== Sidebar ===== */}
      <aside
        className={`${
          sidebarOpen ? "w-[280px]" : "w-0"
        } flex-shrink-0 transition-all duration-300 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col overflow-hidden`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h1 className="text-base font-bold text-edu-primary dark:text-blue-400">
                K12 智能教学助手
              </h1>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-lg"
              aria-label="切换主题"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-edu-primary text-white rounded-xl hover:bg-edu-primary-dark transition-colors font-medium text-sm active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新的对话</span>
          </button>
          <button
            onClick={() => setShowPptParser(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-colors font-medium text-sm active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>上传PPT智能解析</span>
          </button>
        </div>

        {/* Grade selector */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <GradeSelector grade={grade} onGradeChange={handleGradeChange} />
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">
            对话历史
          </h3>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span className="text-3xl mb-2">💬</span>
              <p className="text-xs text-slate-400 dark:text-slate-500">暂无对话记录</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => {
                const isActive =
                  s.id === sessionId && messages.length > 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSessionClick(s)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-edu-primary-light dark:bg-blue-900/40 text-edu-primary dark:text-blue-300"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="truncate font-medium">{s.title}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>{GRADE_LABELS[s.grade] || s.grade}</span>
                      <span>·</span>
                      <span>{s.messages.length} 条消息</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Learning stats */}
        {greeting?.stats && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              学习统计
            </h3>
            {/* Level + XP Bar */}
            <div className="mb-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  Lv.{greeting.stats.level || 1}
                </span>
                <span className="text-[10px] text-slate-400">
                  {greeting.stats.streak > 0 && `🔥${greeting.stats.streak}连击 `}
                  ⭐{greeting.stats.xp || 0}/{greeting.stats.xp_for_next || 100}XP
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-amber-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((greeting.stats.xp || 0) / (greeting.stats.xp_for_next || 100)) * 100)}%` }}
                />
              </div>
            </div>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-edu-primary">{greeting.stats.total_messages}</div>
                <div className="text-[10px] text-slate-400">消息数</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-emerald-500">{greeting.stats.total_quizzes}</div>
                <div className="text-[10px] text-slate-400">答题数</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-amber-500">{Math.round(greeting.stats.accuracy * 100)}%</div>
                <div className="text-[10px] text-slate-400">正确率</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-red-400">{greeting.stats.max_streak || 0}</div>
                <div className="text-[10px] text-slate-400">最长连击</div>
              </div>
            </div>
            {/* Top interests */}
            {greeting.stats.top_interests?.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] text-slate-400 mb-1">感兴趣的话题</div>
                <div className="flex flex-wrap gap-1">
                  {greeting.stats.top_interests.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-[10px] text-blue-700 dark:text-blue-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {greeting.stats.mastered_topics.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] text-slate-400 mb-1">已掌握</div>
                <div className="flex flex-wrap gap-1">
                  {greeting.stats.mastered_topics.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-[10px] text-emerald-700 dark:text-emerald-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {greeting.stats.weak_topics.length > 0 && (
              <div className="mt-2">
                <div className="text-[10px] text-slate-400 mb-1">需加强</div>
                <div className="flex flex-wrap gap-1">
                  {greeting.stats.weak_topics.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/30 text-[10px] text-red-700 dark:text-red-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sidebar footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center">
            K12 AI 智能教学助手 v1.0
          </p>
        </div>
      </aside>

      {/* ===== Main Area ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="切换侧边栏"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{sessionTitle}</h2>
            <span className="text-xs text-slate-400">{GRADE_LABELS[grade]}</span>
          </div>
          <button onClick={toggleDarkMode} className="p-1.5 text-lg">
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        {/* ===== Messages Area ===== */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-edu-primary to-blue-400 flex items-center justify-center text-4xl mb-6 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                  🤖
                </div>
                <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">
                  K12 智能教学助手
                </h2>

                {/* Greeting from API */}
                {greeting && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 max-w-md leading-relaxed">
                    {greeting.greeting}
                  </p>
                )}
                {!greeting && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md leading-relaxed">
                    你好！我是你的专属AI老师。选择你的年级，开始学习吧！
                  </p>
                )}

                {/* Current grade indicator */}
                <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-edu-primary-light dark:bg-blue-900/30 text-edu-primary dark:text-blue-300 text-sm font-medium">
                  <span>当前年级：</span>
                  <span>{GRADE_LABELS[grade]}</span>
                </div>

                {/* Greeting suggestions (from API) or fallback topics */}
                {greeting?.suggestions && greeting.suggestions.length > 0 ? (
                  <div className="w-full max-w-md">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                      选择你想学的内容：
                    </p>
                    <div className="grid grid-cols-1 gap-2.5">
                      {greeting.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleGreetingClick(s.topic)}
                          className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-edu-primary dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 transition-all text-sm font-medium active:scale-[0.97] text-left"
                        >
                          <span className="text-base mr-2">{
                            s.action === "teach" ? "📖" : s.action === "quiz" ? "✏️" : s.action === "animate" ? "🎬" : "💬"
                          }</span>
                          {s.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-md">
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                      试试这些话题：
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {TOPIC_SUGGESTIONS[grade].map((topic) => (
                        <button
                          key={topic}
                          onClick={() => handleSend(topic)}
                          className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-edu-primary dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 transition-all text-sm font-medium active:scale-[0.97]"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message list */}
            {messages.map((msg) => (
              <div key={msg.id} className="animate-message-in">
                <ChatMessage message={msg} sessionId={sessionId} />
              </div>
            ))}

            {/* Loading dots */}
            {isLoading && (
              <div className="flex items-start gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm">
                  AI
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mb-1 block">
                    AI 助手
                  </span>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="loading-dots flex gap-1.5">
                      <span className="w-2 h-2 bg-slate-400 rounded-full inline-block" />
                      <span className="w-2 h-2 bg-slate-400 rounded-full inline-block" />
                      <span className="w-2 h-2 bg-slate-400 rounded-full inline-block" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Next-step suggestions */}
            {nextSteps && messages.length > 0 && !isLoading && (
              <div className="animate-fade-in">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                    {nextSteps.message}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {nextSteps.suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleGreetingClick(s.topic)}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:border-edu-primary dark:hover:border-blue-500 text-sm text-slate-600 dark:text-slate-300 transition-all active:scale-[0.97]"
                      >
                        {s.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ===== Input Area ===== */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          {/* Quick action buttons */}
          <div className="max-w-4xl mx-auto px-4 pt-3 pb-1.5 flex gap-2 overflow-x-auto">
            {QUICK_ACTIONS.map((action) => {
              if ("isResource" in action && action.isResource) {
                return (
                  <div key="resources" className="flex gap-1.5">
                    <button
                      onClick={() => downloadResource("ppt", "AI基础", grade, sessionId)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-40 whitespace-nowrap active:scale-[0.97]"
                    >
                      <span>📊</span><span>PPT</span>
                    </button>
                    <button
                      onClick={() => downloadResource("word", "AI基础", grade, sessionId)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-40 whitespace-nowrap active:scale-[0.97]"
                    >
                      <span>📄</span><span>文档</span>
                    </button>
                  </div>
                );
              }
              return (
                <button
                  key={action.prompt}
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-40 whitespace-nowrap active:scale-[0.97]"
                >
                  <span className="text-sm">{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              );
            })}
            <div className="flex-1" />
            <span className="text-[10px] text-slate-300 dark:text-slate-600 self-center hidden sm:block">
              Enter 发送 · Shift+Enter 换行
            </span>
          </div>

          {/* Input row */}
          <div className="max-w-4xl mx-auto px-4 pb-4 pt-1.5">
            <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-700/50 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-edu-primary/30 focus-within:bg-white dark:focus-within:bg-slate-700 transition-all border border-transparent focus-within:border-edu-primary/20">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题，开始学习吧..."
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm placeholder-slate-400 dark:placeholder-slate-500 max-h-32 leading-relaxed"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-edu-primary text-white flex items-center justify-center hover:bg-edu-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-90"
                aria-label="发送消息"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h14M12 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PPT Parser Modal */}
      {showPptParser && (
        <PptParser grade={grade} onClose={() => setShowPptParser(false)} />
      )}
    </div>
  );
}
