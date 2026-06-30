"use client";

import { useState } from "react";
import { executeCode } from "../lib/api";

interface CodeData {
  title: string;
  explanation: string;
  code: string;
  expected_output: string;
  challenge: string;
}

interface CodeBlockProps {
  code: CodeData;
}

export default function CodeBlock({ code: codeData }: CodeBlockProps) {
  const { code, title, explanation, expected_output, challenge } = codeData;
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput(null);
    setError(null);

    try {
      const res = await executeCode({ code });
      if (res.stderr) {
        setOutput(res.stderr);
        setError("程序运行出错");
      } else {
        setOutput(res.stdout || "(无输出)");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "运行失败";
      setOutput(msg);
      setError("运行出错");
    } finally {
      setIsRunning(false);
    }
  };

  const langLabel = "python";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="code-header flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          {/* Mac-style dots */}
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-2 uppercase">
            {langLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-md text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="复制代码"
          >
            {copied ? "✓ 已复制" : "复制"}
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-edu-primary text-white hover:bg-edu-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? (
              <>
                <svg className="animate-spin-slow w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                运行中
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                运行代码
              </>
            )}
          </button>
        </div>
      </div>

      {/* Explanation */}
      {title && (
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-blue-50/50 dark:bg-blue-900/10">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
          {explanation && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{explanation}</p>}
        </div>
      )}

      {/* Code */}
      <pre className="overflow-x-auto">
        <code className="block p-4 text-sm font-mono leading-relaxed text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50">
          {code}
        </code>
      </pre>

      {/* Expected output and challenge */}
      {(expected_output || challenge) && (
        <div className="border-t border-slate-100 dark:border-slate-700/50 px-4 py-3 bg-slate-50 dark:bg-slate-900/30 space-y-2">
          {expected_output && (
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">预期输出：</span>
              <code className="text-xs text-slate-600 dark:text-slate-300 ml-1">{expected_output}</code>
            </div>
          )}
          {challenge && (
            <div>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">挑战：</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{challenge}</span>
            </div>
          )}
        </div>
      )}

      {/* Output */}
      {output !== null && (
        <div className="animate-slide-up border-t border-slate-200 dark:border-slate-700">
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700/40 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${error ? "bg-red-400" : "bg-emerald-400"}`} />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {error ? "错误输出" : "运行结果"}
            </span>
          </div>
          <pre className="p-4 text-sm font-mono leading-relaxed text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 overflow-x-auto whitespace-pre-wrap">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
