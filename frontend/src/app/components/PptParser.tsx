"use client";

import { useState, useRef } from "react";
import { deepParsePpt, type PptParseResult } from "../lib/api";

interface PptParserProps {
  grade: string;
  onClose: () => void;
}

export default function PptParser({ grade, onClose }: PptParserProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<PptParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "slides" | "quiz" | "knowledge">("overview");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && (f.name.endsWith(".pptx") || f.name.endsWith(".ppt"))) {
      setFile(f);
      setError(null);
      setResult(null);
    } else {
      setError("请选择 .pptx 或 .ppt 文件");
    }
  };

  const handleParse = async () => {
    if (!file || isParsing) return;
    setIsParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("grade", grade);
      formData.append("auto_index", "true");
      const res = await deepParsePpt(formData);
      setResult(res);
      if (res.error) setError(res.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">PPT智能解析</h2>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
              L1+L2 文本提取 + LLM智能解析
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Upload area (before parse) */}
        {!result && (
          <div className="flex-1 overflow-y-auto p-6">
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
                file
                  ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-slate-300 dark:border-slate-600 hover:border-edu-primary hover:bg-blue-50 dark:hover:bg-blue-900/20"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pptx,.ppt"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div>
                  <span className="text-4xl mb-3 block">📄</span>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <span className="text-4xl mb-3 block">📤</span>
                  <p className="text-sm text-slate-500 dark:text-slate-400">拖拽或点击上传教学PPT</p>
                  <p className="text-xs text-slate-400 mt-1">支持 .pptx .ppt 格式</p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-3 text-center">{error}</p>
            )}

            <p className="text-xs text-slate-400 mt-4 text-center leading-relaxed">
              <strong>L1.</strong>提取PPT文字 → <strong>L2.</strong>提取图片OCR识别（tesseract，免费本地）→ <strong>L3-5.</strong>LLM智能解析
              <br />
              LLM全程只看文字不看图，零多模态token消耗
            </p>
          </div>
        )}

        {/* Result view */}
        {result && !result.error && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tabs */}
            <div className="flex gap-0 px-6 border-b border-slate-200 dark:border-slate-700">
              {([
                ["overview", "总览"],
                ["slides", "页面分析"],
                ["quiz", "生成题目"],
                ["knowledge", "知识条目"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? "border-edu-primary text-edu-primary"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {result.course_meta && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{result.course_meta.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs px-2 py-1 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          学科: {result.course_meta.subject}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          难度: {result.course_meta.difficulty}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          学段: {result.course_meta.estimated_grade}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          时长: {result.course_meta.estimated_duration}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                          已索引 {result.indexed_count || 0} 条知识
                        </span>
                        {/* Image processing stats */}
                        {result.image_stats && (result.image_stats.total_images ?? 0) > 0 && (
                          <span className="text-xs px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            OCR {result.image_stats.ocr_handled}张 + 多模态 {result.image_stats.multimodal_handled}张 = {result.image_stats.ocr_chars + result.image_stats.multimodal_chars}字
                          </span>
                        )}
                      </div>
                      {result.course_meta.prerequisites?.length > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                          前置知识: {result.course_meta.prerequisites.join("、")}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Key concepts */}
                  {result.key_concepts && result.key_concepts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">核心概念 ({result.key_concepts.length}个)</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {result.key_concepts.map((c, i) => (
                          <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{c.term}</div>
                            <div className="text-xs text-slate-500 mt-1">{c.definition}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Teaching suggestions */}
                  {result.teaching_suggestions && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">教学建议</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {result.teaching_suggestions.animation_topics?.length > 0 && (
                          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                            <div className="font-medium text-purple-700 dark:text-purple-300 mb-1">🎬 适合动画</div>
                            {result.teaching_suggestions.animation_topics.map((t, i) => (
                              <div key={i} className="text-purple-600 dark:text-purple-400">· {t}</div>
                            ))}
                          </div>
                        )}
                        {result.teaching_suggestions.coding_examples?.length > 0 && (
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                            <div className="font-medium text-emerald-700 dark:text-emerald-300 mb-1">💻 适合编程</div>
                            {result.teaching_suggestions.coding_examples.map((t, i) => (
                              <div key={i} className="text-emerald-600 dark:text-emerald-400">· {t}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      {result.teaching_suggestions.recommended_next && (
                        <p className="text-xs text-slate-500 mt-2">
                          📖 建议下一步: {result.teaching_suggestions.recommended_next}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "slides" && result.slide_analysis && (
                <div className="space-y-2">
                  {result.slide_analysis.map((s) => (
                    <div key={s.slide_num} className="flex gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        s.importance === "core" ? "bg-red-100 text-red-600" :
                        s.importance === "supporting" ? "bg-blue-100 text-blue-600" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {s.slide_num}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            s.type === "content" ? "bg-blue-100 text-blue-600" :
                            s.type === "example" ? "bg-amber-100 text-amber-600" :
                            s.type === "exercise" ? "bg-emerald-100 text-emerald-600" :
                            s.type === "summary" ? "bg-purple-100 text-purple-600" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {s.type === "content" ? "内容" :
                             s.type === "example" ? "例子" :
                             s.type === "exercise" ? "练习" :
                             s.type === "summary" ? "小结" :
                             s.type === "title" ? "标题" : "过渡"}
                          </span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{s.heading}</span>
                        </div>
                        <p className="text-xs text-slate-500">{s.key_message}</p>
                        {s.knowledge_points?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.knowledge_points.map((kp, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">{kp}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "quiz" && result.generated_quiz && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">已生成 {result.generated_quiz.length} 道练习题</p>
                  {result.generated_quiz.map((q, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-full bg-edu-primary text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{q.question}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-8">
                        {q.options.map((opt, j) => (
                          <div
                            key={j}
                            className={`text-xs px-3 py-2 rounded-lg ${
                              opt.startsWith(q.answer + ".")
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium"
                                : "bg-white dark:bg-slate-800 text-slate-500"
                            }`}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 ml-8">{q.explanation}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "knowledge" && result.knowledge_entries && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">已生成 {result.knowledge_entries.length} 条知识条目（已自动入库）</p>
                  {result.knowledge_entries.map((e, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600">{e.grade}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-500">{e.topic}</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{e.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{e.content.slice(0, 250)}{e.content.length > 250 ? "..." : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {result?.error && (
          <div className="p-6 text-center">
            <p className="text-red-500 mb-2">解析失败: {result.error}</p>
            <button
              onClick={() => setResult(null)}
              className="text-sm text-edu-primary hover:underline"
            >
              重新上传
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          {!result ? (
            <>
              <p className="text-xs text-slate-400">
                {file ? `已选: ${file.name}` : "选择PPT文件开始智能解析"}
              </p>
              <button
                onClick={handleParse}
                disabled={!file || isParsing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-edu-primary text-white text-sm font-medium hover:bg-edu-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isParsing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    解析中...
                  </>
                ) : (
                  <>开始解析</>
                )}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                {result.total_slides}页 · {result.key_concepts?.length || 0}个概念 · {result.generated_quiz?.length || 0}道题 · {result.indexed_count || 0}条入库
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                完成
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
