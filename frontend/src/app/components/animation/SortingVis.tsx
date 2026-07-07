"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { SortingConfig } from "./types"

interface Props { config: SortingConfig }

export default function SortingVis({ config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef<number[]>([])
  const idxRef = useRef({ i: 0, j: 0, sorted: 0, phase: "compare" as string })
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "done">("idle")
  const [compares, setCompares] = useState(0)

  const size = config.arraySize ?? 15
  const speed = config.speed === "fast" ? 30 : config.speed === "slow" ? 150 : 70
  const algorithm = config.algorithm ?? "bubble"

  const init = useCallback(() => {
    const arr: number[] = []
    for (let i = 0; i < size; i++) arr.push(Math.random() * 0.85 + 0.05)
    dataRef.current = arr
    idxRef.current = { i: 0, j: 0, sorted: 0, phase: "compare" }
    setCompares(0)
    drawBars(arr)
  }, [size])

  const drawBars = (arr: number[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, W, H)
    const barW = (W / arr.length) * 0.8
    const gap = (W / arr.length) * 0.2

    arr.forEach((v, idx) => {
      const x = idx * (barW + gap) + gap / 2
      const barH = v * (H - 40)
      const y = H - barH

      // Highlight current compare pair
      const { i, j, sorted } = idxRef.current
      let color = "#6366f1"
      if (idx >= arr.length - sorted) color = "#22c55e" // sorted (green)
      else if (idx === j || idx === j + 1) color = "#f59e0b" // comparing (amber)

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0])
      ctx.fill()

      // Value label
      ctx.fillStyle = "#94a3b8"
      ctx.font = `${Math.max(9, barW / 2)}px sans-serif`
      ctx.textAlign = "center"
      ctx.fillText(Math.round(v * 100).toString(), x + barW / 2, y - 4)
      ctx.textAlign = "start"
    })
  }

  const tick = useCallback(() => {
    const arr = dataRef.current
    const n = arr.length
    let { i, j, sorted, phase } = idxRef.current

    if (algorithm === "bubble") {
      if (sorted >= n - 1) return finish()

      if (j >= n - sorted - 1) {
        sorted++
        j = 0
        i = sorted
      } else {
        if (arr[j] > arr[j + 1]) {
          [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
          setCompares(c => c + 1)
        }
        j++
      }
    } else if (algorithm === "selection") {
      if (sorted >= n - 1) return finish()

      if (phase === "findMin") {
        if (j >= n) {
          // swap
          if (i !== sorted) {
            [arr[sorted], arr[i]] = [arr[i], arr[sorted]]
          }
          sorted++
          j = sorted
          i = sorted
          setCompares(c => c + 1)
        } else {
          if (arr[j] < arr[i]) i = j
          j++
        }
      } else {
        phase = "findMin"
        j = sorted
        i = sorted
      }
    } else if (algorithm === "insertion") {
      if (sorted >= n) return finish()
      if (j > 0 && arr[j] < arr[j - 1]) {
        [arr[j], arr[j - 1]] = [arr[j - 1], arr[j]]
        setCompares(c => c + 1)
        j--
      } else {
        sorted++
        j = sorted
      }
    }

    idxRef.current = { i, j, sorted, phase }
    drawBars(arr)
  }, [algorithm])

  const finish = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setStatus("done")
    drawBars(dataRef.current)
  }

  useEffect(() => { init() }, [init])

  function start() {
    init()
    idxRef.current.j = idxRef.current.i = 0
    idxRef.current.sorted = 0
    setStatus("running")
    timerRef.current = setInterval(tick, speed)
  }

  function pause() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setStatus("paused")
  }

  function resetFn() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    init()
    setStatus("idle")
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  return (
    <div className="flex flex-col items-center p-4">
      <canvas ref={canvasRef} className="w-full max-w-[600px] rounded-lg" />
      <div className="flex items-center gap-2 mt-3">
        <button onClick={start} className="px-4 py-1.5 text-xs rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">▶ 开始</button>
        <button onClick={pause} className="px-4 py-1.5 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">⏸ 暂停</button>
        <button onClick={resetFn} className="px-4 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-300 transition-colors">↺ 重置</button>
        <span className="text-xs text-slate-400 ml-2">比较: {compares} 次</span>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {algorithmLabels[algorithm]}：<span className="text-amber-500">■</span> 比较中 <span className="text-green-500">■</span> 已排好
      </p>
    </div>
  )
}

const algorithmLabels: Record<string, string> = {
  bubble: "冒泡排序", selection: "选择排序", insertion: "插入排序",
  quick: "快速排序", merge: "归并排序",
}

// Augment CanvasRenderingContext2D for roundRect (available in modern browsers)
declare global {
  interface CanvasRenderingContext2D {
    roundRect(x: number, y: number, w: number, h: number, r: number | number[]): void
  }
}
