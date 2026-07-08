"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { GradientDescentConfig } from "./types"

interface Props { config: GradientDescentConfig }

export default function GradientDescentVis({ config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const posRef = useRef({ x: config.startPoint?.[0] ?? -5, y: config.startPoint?.[1] ?? -5 })
  const stepRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const trailRef = useRef<[number, number][]>([])
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "done">("idle")

  const lr = config.learningRate ?? 0.1
  const maxSteps = config.steps ?? 30
  const fnName = config.function ?? "bowl"

  function f(x: number, y: number): number {
    switch (fnName) {
      case "bowl": return (x - 1) ** 2 + (y - 2) ** 2
      case "saddle": return x ** 2 - y ** 2
      case "himmelblau": return (x ** 2 + y - 11) ** 2 + (x + y ** 2 - 7) ** 2
      case "rosenbrock": return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2
      case "wavy": return Math.sin(x) * Math.cos(y) + (x ** 2 + y ** 2) * 0.05
      default: return (x - 1) ** 2 + (y - 2) ** 2
    }
  }

  function gradient(x: number, y: number): [number, number] {
    const h = 0.001
    const dx = (f(x + h, y) - f(x - h, y)) / (2 * h)
    const dy = (f(x, y + h) - f(x, y - h)) / (2 * h)
    return [dx, dy]
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, W, H)

    const margin = 40
    const pw = W - margin * 2
    const ph = H - margin * 2

    // Coordinate mapping: [-6, 6] → [margin, margin+pw]
    function sx(x: number) { return margin + ((x + 6) / 12) * pw }
    function sy(y: number) { return H - margin - ((y + 6) / 12) * ph }

    // Draw contour background (heatmap cells)
    const step = 0.5
    for (let gy = -6; gy <= 6; gy += step) {
      for (let gx = -6; gx <= 6; gx += step) {
        const v = f(gx, gy)
        const minV = -10, maxV = 50
        const t = Math.max(0, Math.min(1, (v - minV) / (maxV - minV)))
        const r = Math.round(30 + t * 200)
        const g = Math.round(60 + t * 80)
        const b = Math.round(200 - t * 150)
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(sx(gx), sy(gy + step), step / 12 * pw, step / 12 * ph)
      }
    }

    // Draw axes
    ctx.strokeStyle = "#94a3b8"
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(margin, H / 2); ctx.lineTo(W - margin, H / 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W / 2, margin); ctx.lineTo(W / 2, H - margin); ctx.stroke()

    // Draw trail
    const trail = trailRef.current
    if (trail.length > 1) {
      ctx.strokeStyle = "#f59e0b"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(sx(trail[0][0]), sy(trail[0][1]))
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(sx(trail[i][0]), sy(trail[i][1]))
      }
      ctx.stroke()

      // Draw trail dots
      trail.forEach(([tx, ty], idx) => {
        const alpha = idx / trail.length
        ctx.fillStyle = idx === trail.length - 1 ? "#ef4444" : `rgba(245,158,11,${0.3 + alpha * 0.7})`
        ctx.beginPath()
        ctx.arc(sx(tx), sy(ty), idx === trail.length - 1 ? 5 : 2.5, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // Current position info
    const { x, y } = posRef.current
    ctx.fillStyle = "#1e293b"
    ctx.font = "12px monospace"
    ctx.fillText(`f(${x.toFixed(2)}, ${y.toFixed(2)}) = ${f(x, y).toFixed(2)}`, 10, 20)
    ctx.fillText(`梯度: (${gradient(x, y)[0].toFixed(2)}, ${gradient(x, y)[1].toFixed(2)})`, 10, 36)
    ctx.fillText(`步数: ${stepRef.current}/${maxSteps} | LR=${lr}`, 10, 52)
  }, [fnName, lr, maxSteps])

  function init() {
    posRef.current = { x: config.startPoint?.[0] ?? -5, y: config.startPoint?.[1] ?? -5 }
    stepRef.current = 0
    trailRef.current = [[posRef.current.x, posRef.current.y]]
    draw()
  }

  function tick() {
    if (stepRef.current >= maxSteps) return finish()
    const { x, y } = posRef.current
    const [dx, dy] = gradient(x, y)
    posRef.current = { x: x - lr * dx, y: y - lr * dy }
    stepRef.current++
    trailRef.current.push([posRef.current.x, posRef.current.y])
    draw()
  }

  function finish() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setStatus("done")
  }

  function start() { init(); trailRef.current = [[posRef.current.x, posRef.current.y]]; setStatus("running"); timerRef.current = setInterval(tick, 200) }
  function pause() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }; setStatus("paused") }
  function resetFn() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }; init(); setStatus("idle") }

  useEffect(() => { resizeCanvas(canvasRef); init() }, [])
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  return (
    <div className="flex flex-col items-center p-4">
      <canvas ref={canvasRef} className="w-full max-w-full rounded-lg" />
      <div className="flex gap-2 mt-3">
        <button onClick={start} className="px-4 py-1.5 text-xs rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">▶ 开始</button>
        <button onClick={pause} className="px-4 py-1.5 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">⏸ 暂停</button>
        <button onClick={resetFn} className="px-4 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-300 transition-colors">↺ 重置</button>
      </div>
    </div>
  )
}

function resizeCanvas(ref: React.RefObject<HTMLCanvasElement | null>) {
  const canvas = ref.current
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  canvas.width = (parent.clientWidth || 600) - 32
  canvas.height = Math.min(420, window.innerHeight * 0.55)
}
