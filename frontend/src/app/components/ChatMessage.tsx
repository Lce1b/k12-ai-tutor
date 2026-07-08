"use client";

import MarkdownRenderer from "./MarkdownRenderer";
import QuizCard from "./QuizCard";
import CodeBlock from "./CodeBlock";
import AnimationRenderer from "./animation/AnimationRenderer";
import type { AnyAnimationConfig } from "./animation/types";

export interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  type: "chat" | "lesson" | "quiz" | "code" | "animation" | "picture_book";
  lesson?: {
    title: string;
    content: string;
    keyPoints?: string[];
  };
  quiz?: {
    questions: {
      type: string;
      question: string;
      options: string[];
      answer: string;
      explanation: string;
    }[];
  };
  code?: {
    title: string;
    explanation: string;
    code: string;
    expected_output: string;
    challenge: string;
  };
  animationConfig?: AnyAnimationConfig;
  story?: {
    title: string;
    pages: { text: string; image_prompt: string }[];
    moral: string;
  };
  timestamp: Date;
}

interface ChatMessageProps {
  message: MessageData;
  sessionId: string;
}

/* ---------- Lesson Card ---------- */
function LessonCard({ lesson }: { lesson: NonNullable<MessageData["lesson"]> }) {
  return (
    <div className="lesson-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-slate-200 dark:border-slate-700">
        <span className="text-lg">📖</span>
        <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
          {lesson.title}
        </h3>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {lesson.content}
        </p>
        {lesson.keyPoints && lesson.keyPoints.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              学习要点
            </h4>
            <ul className="space-y-1.5">
              {lesson.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="text-edu-primary mt-0.5 flex-shrink-0">✦</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Animation Card (new: config-driven) ---------- */
function AnimationCard({ config }: { config: AnyAnimationConfig }) {
  return <AnimationRenderer config={config} />
}

/* ---------- Picture Book Card ---------- */
function PictureBookCard({ story }: { story: NonNullable<MessageData["story"]> }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-900/20 dark:to-amber-900/20 border-b border-slate-200 dark:border-slate-700">
        <span className="text-lg">📖</span>
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
          {story.title || "绘本故事"}
        </span>
      </div>
      <div className="px-5 py-4 space-y-4">
        {(story.pages || []).map((page, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30"
          >
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-center">
              {page.text}
            </p>
            {page.image_prompt && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                画面: {page.image_prompt}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========== Main ChatMessage Component ========== */
export default function ChatMessage({ message, sessionId }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
          isUser
            ? "bg-gradient-to-br from-edu-primary to-blue-400 text-white shadow-sm"
            : "bg-gradient-to-br from-amber-400 to-orange-400 text-white shadow-sm"
        }`}
      >
        {isUser ? "我" : "AI"}
      </div>

      {/* Bubble — tight for text, wide for animation */}
      <div className={`${isUser ? "items-end" : "items-start"} flex flex-col ${
        message.type === "animation" ? "w-full" : "max-w-[85%] md:max-w-[75%]"
      }`}>
        {/* Role label */}
        <span className={`text-[11px] text-slate-400 dark:text-slate-500 mb-1 ${isUser ? "text-right" : ""}`}>
          {isUser ? "你" : "AI 助手"}
        </span>

        <div
          className={`rounded-2xl ${
            isUser
              ? "bg-edu-primary text-white rounded-tr-sm"
              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-sm border border-slate-200 dark:border-slate-700"
          }`}
        >
          {/* Chat text content */}
          {message.content && message.type === "chat" && (
            <div className="px-4 py-3">
              <MarkdownRenderer content={message.content} />
            </div>
          )}

          {/* Lesson card */}
          {message.type === "lesson" && message.lesson && (
            <div className="min-w-[280px]">
              {message.content && (
                <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  <MarkdownRenderer content={message.content} />
                </div>
              )}
              <LessonCard lesson={message.lesson} />
            </div>
          )}

          {/* Quiz card */}
          {message.type === "quiz" && message.quiz && (
            <div className="min-w-[280px]">
              {message.content && (
                <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  <MarkdownRenderer content={message.content} />
                </div>
              )}
              <QuizCard quiz={message.quiz} sessionId={sessionId} />
            </div>
          )}

          {/* Code block */}
          {message.type === "code" && message.code && (
            <div className="min-w-[280px]">
              {message.content && (
                <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  <MarkdownRenderer content={message.content} />
                </div>
              )}
              <CodeBlock code={message.code} />
            </div>
          )}

          {/* Animation */}
          {message.type === "animation" && message.animationConfig && (
            <div className="w-full">
              {message.content && (
                <div className="px-4 pt-3 pb-2">
                  <MarkdownRenderer content={message.content} />
                </div>
              )}
              <AnimationCard config={message.animationConfig} />
            </div>
          )}

          {/* Picture book */}
          {message.type === "picture_book" && message.story && (
            <div>
              {message.content && (
                <div className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-700/50">
                  <MarkdownRenderer content={message.content} />
                </div>
              )}
              <PictureBookCard story={message.story} />
            </div>
          )}

          {/* Fallback: render content if type doesn't match any special card but has content */}
          {message.content && !["chat", "lesson", "quiz", "code", "animation", "picture_book"].includes(message.type) && (
            <div className="px-4 py-3">
              <MarkdownRenderer content={message.content} />
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className={`text-[10px] text-slate-400 dark:text-slate-600 mt-1 ${isUser ? "text-right" : ""}`}>
          {new Date(message.timestamp).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
