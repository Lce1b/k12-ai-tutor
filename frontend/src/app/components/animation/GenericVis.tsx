"use client"

import { useEffect, useRef } from "react"
import type { GenericConfig } from "./types"

interface Props { config: GenericConfig }

export default function GenericVis({ config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const topic = config.topicText ?? config.title ?? ""
  const count = config.particles ?? 40

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    canvas.width = (parent.clientWidth || 500) - 32
    canvas.height = Math.min(400, window.innerHeight * 0.5)

    const ctx = canvas.getContext("2d")!
    const W = canvas.width, H = canvas.height

    interface Particle { x: number; y: number; vx: number; vy: number; r: number; hue: number; alpha: number }
    const particles: Particle[] = []
    const colors = ["#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f59e0b", "#22c55e", "#06b6d4"]
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
        r: Math.random() * 4 + 2,
        hue: Math.floor(Math.random() * 360),
        alpha: Math.random() * 0.5 + 0.3,
      })
    }

    // Floating topic characters
    const chars = [...topic].filter(c => c.trim())
    const charPositions = chars.map((_, i) => ({
      char: chars[i],
      x: W * 0.1 + Math.random() * W * 0.6,
      y: H * 0.2 + Math.random() * H * 0.4,
      baseY: H * 0.2 + Math.random() * H * 0.4,
      size: 16 + Math.random() * 18,
      hue: Math.floor(Math.random() * 360),
      phase: Math.random() * Math.PI * 2,
    }))

    let frame = 0
    function draw() {
      frame++
      ctx.clearRect(0, 0, W, H)

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, "#f0f0ff")
      grad.addColorStop(0.5, "#fdf2ff")
      grad.addColorStop(1, "#fff0f0")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Particles
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0

        // Draw connections between nearby particles
        particles.forEach(q => {
          const dx = p.x - q.x, dy = p.y - q.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 80) {
            ctx.strokeStyle = `rgba(148,163,184,${0.08 * (1 - dist / 80)})`
            ctx.lineWidth = 0.5
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke()
          }
        })

        ctx.fillStyle = `hsla(${p.hue},70%,60%,${p.alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Floating topic characters
      charPositions.forEach(cp => {
        cp.y = cp.baseY + Math.sin(frame * 0.03 + cp.phase) * 15
        ctx.font = `${cp.size}px "Microsoft YaHei", sans-serif`
        ctx.fillStyle = `hsl(${cp.hue},60%,50%)`
        ctx.textAlign = "center"
        ctx.fillText(cp.char, cp.x, cp.y)
      })
      ctx.textAlign = "start"

      // Title
      ctx.font = "bold 18px sans-serif"
      ctx.fillStyle = "#334155"
      ctx.textAlign = "center"
      ctx.fillText(topic, W / 2, H - 30)

      // Hint
      ctx.font = "12px sans-serif"
      ctx.fillStyle = "#94a3b8"
      ctx.fillText(`${config.message ?? "这是一个通用可视化"} — 试试 AI 相关话题效果更好哦`, W / 2, H - 8)
      ctx.textAlign = "start"

      requestAnimationFrame(draw)
    }

    const raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [topic, count, config.message])

  return (
    <div className="flex flex-col items-center p-4">
      <canvas ref={canvasRef} className="w-full max-w-full rounded-lg" />
    </div>
  )
}
