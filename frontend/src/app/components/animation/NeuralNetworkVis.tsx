"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { NeuralNetworkConfig } from "./types"

interface Props { config: NeuralNetworkConfig }

export default function NeuralNetworkVis({ config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<{ running: boolean; step: number }>({ running: false, step: 0 })
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle")

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    const layers = config.layers
    const layerGap = W / (layers.length + 1)
    const neuronR = Math.min(18, (H / Math.max(...layers)) / 2.5)

    // Draw connections
    const step = animRef.current.step
    for (let l = 1; l < layers.length; l++) {
      const x1 = layerGap * l
      const x2 = layerGap * (l + 1)
      for (let i = 0; i < layers[l - 1]; i++) {
        const y1 = (H / (layers[l - 1] + 1)) * (i + 1)
        for (let j = 0; j < layers[l]; j++) {
          const y2 = (H / (layers[l] + 1)) * (j + 1)
          // Animated signal dash
          const sigPhase = (step * 8 + i + j) % 100
          const sigT = Math.max(0, sigPhase / 100)
          const sx = x1 + (x2 - x1) * sigT
          const sy = y1 + (y2 - y1) * sigT

          ctx.strokeStyle = "#cbd5e1"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()

          // Weight label
          if (config.showWeights) {
            ctx.fillStyle = "#94a3b8"
            ctx.font = "10px sans-serif"
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2 - 5
            ctx.fillText("w", midX, midY)
          }

          // Signal dot
          if (animRef.current.running) {
            ctx.fillStyle = "#6366f1"
            ctx.beginPath()
            ctx.arc(sx, sy, 3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    }

    // Draw neurons
    for (let l = 0; l < layers.length; l++) {
      const x = layerGap * (l + 1)
      const count = layers[l]
      const label = l === 0 ? "输入" : l === layers.length - 1 ? "输出" : `隐藏${l}`

      for (let i = 0; i < count; i++) {
        const y = (H / (count + 1)) * (i + 1)
        const alpha = animRef.current.running ? 0.5 + 0.5 * Math.sin(step * 0.1 + i) : 0.8

        ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, neuronR, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#4f46e5"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Layer label
      ctx.fillStyle = "#64748b"
      ctx.font = "11px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(label, x, H - 8)
    }
    ctx.textAlign = "start"
  }, [config])

  useEffect(() => {
    let raf: number
    const loop = () => {
      if (animRef.current.running) animRef.current.step++
      draw()
      raf = requestAnimationFrame(loop)
    }
    resizeCanvas(canvasRef)
    raf = requestAnimationFrame(loop)
    window.addEventListener("resize", () => { resizeCanvas(canvasRef); draw() })
    return () => { cancelAnimationFrame(raf) }
  }, [draw])

  function toggle() {
    animRef.current.running = !animRef.current.running
    setStatus(animRef.current.running ? "running" : "paused")
  }

  function reset() {
    animRef.current.running = false
    animRef.current.step = 0
    setStatus("idle")
    draw()
  }

  return (
    <div className="flex flex-col items-center p-4">
      <canvas ref={canvasRef} className="w-full max-w-full rounded-lg" />
      <div className="flex gap-2 mt-3">
        <button onClick={toggle} className="px-4 py-1.5 text-xs rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">
          {status === "running" ? "⏸ 暂停" : "▶ 开始"}
        </button>
        <button onClick={reset} className="px-4 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-300 transition-colors">
          ↺ 重置
        </button>
      </div>
    </div>
  )
}

function resizeCanvas(ref: React.RefObject<HTMLCanvasElement | null>) {
  const canvas = ref.current
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  canvas.width = parent.clientWidth - 32
  canvas.height = Math.min(400, window.innerHeight * 0.5)
}
