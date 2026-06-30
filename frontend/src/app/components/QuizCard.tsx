"use client";

import { useState } from "react";
import { evaluateQuiz } from "../lib/api";

interface QuizQuestion {
  type: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface QuizData {
  questions: QuizQuestion[];
}

interface QuizCardProps {
  quiz: QuizData;
  sessionId: string;
}

export default function QuizCard({ quiz, sessionId }: QuizCardProps) {
  const questions = quiz.questions || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<Record<number, { isCorrect: boolean; feedback: string; explanation: string }>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [quizXp, setQuizXp] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);

  const q = questions[currentIdx];
  if (!q) return null;

  const result = results[currentIdx];

  const handleSelect = async (optionLabel: string) => {
    if (selected !== null || isEvaluating) return;
    setSelected(optionLabel);
    setIsEvaluating(true);

    try {
      const res = await evaluateQuiz({
        question: q as unknown as Record<string, unknown>,
        answer: optionLabel,
        session_id: sessionId,
        topic: q.question.slice(0, 30),
      });
      const xpGain = res.xp?.xp || 0;
      setQuizXp((prev) => prev + xpGain);
      if (res.xp?.leveled_up) setLeveledUp(true);
      setResults((prev) => ({
        ...prev,
        [currentIdx]: {
          isCorrect: res.is_correct,
          feedback: res.feedback + (xpGain > 0 ? ` +${xpGain}XP` : ""),
          explanation: res.explanation,
        },
      }));
    } catch {
      const isCorrect = optionLabel === q.answer;
      setResults((prev) => ({
        ...prev,
        [currentIdx]: {
          isCorrect,
          feedback: isCorrect ? "正确！" : `正确答案是 ${q.answer}`,
          explanation: q.explanation,
        },
      }));
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelected(null);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
      setSelected(null);
    }
  };

  const score = Object.values(results).filter((r) => r.isCorrect).length;
  const allAnswered = Object.keys(results).length === questions.length;

  const getOptionStyle = (label: string) => {
    if (!result) {
      return selected === label
        ? "border-edu-primary bg-blue-50 dark:bg-blue-900/30"
        : "border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20";
    }
    if (label === q.answer) {
      return "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-500/30";
    }
    if (label === selected && !result.isCorrect) {
      return "border-red-400 bg-red-50 dark:bg-red-900/30 ring-2 ring-red-400/30";
    }
    return "border-slate-200 dark:border-slate-600 opacity-50";
  };

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">✏️</span>
          <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
            练习题 ({currentIdx + 1}/{questions.length})
          </span>
        </div>
        <div className="flex items-center gap-3">
          {allAnswered && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              得分: {score}/{questions.length}
            </span>
          )}
          {quizXp > 0 && (
            <span className="text-xs font-bold text-amber-500 animate-bounce-in">
              ⭐ +{quizXp}XP
            </span>
          )}
          {leveledUp && (
            <span className="text-xs font-bold text-purple-500 animate-bounce-in">
              🎉 升级！
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="px-5 py-4">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
          {q.question}
        </p>
      </div>

      {/* Options */}
      <div className="px-5 pb-4 space-y-2">
        {q.options.map((option, index) => {
          const label = optionLabels[index] || String(index);
          return (
            <button
              key={index}
              onClick={() => handleSelect(label)}
              disabled={selected !== null}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all ${getOptionStyle(label)} ${selected !== null ? "cursor-default" : "cursor-pointer"}`}
            >
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  result && label === q.answer
                    ? "bg-emerald-500 text-white"
                    : result && label === selected && !result.isCorrect
                    ? "bg-red-400 text-white"
                    : selected === label
                    ? "bg-edu-primary text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {result && label === q.answer ? "✓" : result && label === selected && !result.isCorrect ? "✗" : label}
              </span>
              <span className="flex-1 pt-0.5 text-slate-700 dark:text-slate-300">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {result && (
        <div className="animate-fade-in px-5 pb-4">
          <div
            className={`p-4 rounded-xl text-sm ${
              result.isCorrect
                ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{result.isCorrect ? "🎉" : "💡"}</span>
              <span className={`font-semibold ${result.isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                {result.feedback}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{result.explanation}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between px-5 pb-4">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          上一题
        </button>
        <span className="text-xs text-slate-400">
          {currentIdx + 1} / {questions.length}
        </span>
        <button
          onClick={handleNext}
          disabled={currentIdx >= questions.length - 1}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          下一题
        </button>
      </div>
    </div>
  );
}
