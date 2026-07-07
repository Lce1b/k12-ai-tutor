"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { KMeansConfig } from "./types"

interface Props { config: KMeansConfig }

interface Point { x: number; y: number; cluster: number }
interface Centroid { x: number; y: number }

export default function KMeansVis({ config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef<Point[]>([])
  const centroidsRef = useRef<Centroid[]>([])
  const iterRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "done">("idle")
  const [iteration, setIteration] = useState(0)

  const k = config.clusters ?? 3
  const n = config.points ?? 50
  const maxIter = config.iterations ?? 5

  const colors = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4"]

  const init = useCallback(() => {
    const pts: Point[] = []
    for (let i = 0; i < n; i++) {
      pts.push({ x: Math.random(), y: Math.random(), cluster: -1 })
    }
    pointsRef.current = pts
    centroidsRef.current = pts.slice(0, k).map(p => ({ x: p.x, y: p.y }))
    iterRef.current = 0
    setIteration(0)
    assignClusters(pts, centroidsRef.current)
  }, [n, k])

  function assignClusters(pts: Point[], cents: Centroid[]) {
    pts.forEach(p => {
      let minD = Infinity
      let best = 0
      cents.forEach((c, i) => {
        const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2
        if (d < minD) { minD = d; best = i }
      })
      p.cluster = best
    })
  }

  function updateCentroids(pts: Point[]): Centroid[] {
    const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, count: 0 }))
    pts.forEach(p => { sums[p.cluster].x += p.x; sums[p.cluster].y += p.y; sums[p.cluster].count++ })
    return sums.map(s => ({ x: s.count > 0 ? s.x / s.count : Math.random(), y: s.count > 0 ? s.y / s.count : Math.random() }))
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, W, H)

    const margin = 20
    const pw = W - margin * 2
    const ph = H - margin * 2 - 20

    const sx = (v: number) => margin + v * pw
    const sy = (v: number) => H - margin - 10 - v * ph

    // Voronoi poly regions
    const cents = centroidsRef.current
    const pts = pointsRef.current
    const step = 0.03
    for (let gx = 0; gx <= 1; gx += step) {
      for (let gy = 0; gy <= 1; gy += step) {
        let minD = Infinity, best = 0
        cents.forEach((c, i) => { const d = (gx - c.x) ** 2 + (gy - c.y) ** 2; if (d < minD) { minD = d; best = i } })
        ctx.fillStyle = colors[best % colors.length] + "15"
        ctx.fillRect(sx(gx), sy(gy + step), step * pw, step * ph)
      }
    }

    // Points
    pts.forEach(p => {
      const c = colors[p.cluster % colors.length] ?? "#6366f1"
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(sx(p.x), sy(p.y), 3.5, 0, Math.PI * 2)
      ctx.fill()
    })

    // Centroids
    cents.forEach((c, i) => {
      ctx.fillStyle = colors[i % colors.length]
      ctx.strokeStyle = "#000"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(sx(c.x), sy(c.y), 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })

    ctx.fillStyle = "#1e293b"
    ctx.font = "12px monospace"
    ctx.fillText(`迭代 ${iterRef.current}/${maxIter}`, margin, 16)
  }, [k, maxIter, colors])

  function tick() {
    if (iterRef.current >= maxIter) return finish()
    const pts = pointsRef.current
    const newCents = updateCentroids(pts)
    centroidsRef.current = newCents
    assignClusters(pts, newCents)
    iterRef.current++
    setIteration(iterRef.current)
    draw()
  }

  function finish() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setStatus("done")
  }

  function start() { init(); setStatus("running"); timerRef.current = setInterval(tick, 600); draw() }
  function pause() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }; setStatus("paused") }
  function resetFn() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }; init(); setStatus("idle"); draw() }

  useEffect(() => { resizeCanvas(canvasRef); init(); draw() }, [])
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  return (
    <div className="flex flex-col items-center p-4">
      <canvas ref={canvasRef} className="w-full max-w-[600px] rounded-lg" />
      <div className="flex items-center gap-2 mt-3">
        <button onClick={start} className="px-4 py-1.5 text-xs rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">▶ 开始</button>
        <button onClick={pause} className="px-4 py-1.5 text-xs rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">⏸ 暂停</button>
        <button onClick={resetFn} className="px-4 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-300 transition-colors">↺ 重置</button>
        <span className="text-xs text-slate-400 ml-2">K={k} | 迭代 {iteration}/{maxIter}</span>
      </div>
      <div className="flex gap-2 mt-2">
        {Array.from({ length: k }, (_, i) => (
          <span key={i} className="text-xs" style={{ color: colors[i] }}>● 簇 {i + 1}</span>
        ))}
      </div>
    </div>
  )
}

function resizeCanvas(ref: React.RefObject<HTMLCanvasElement | null>) {
  const canvas = ref.current
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  canvas.width = Math.min(600, (parent.clientWidth || 600) - 32)
  canvas.height = 380
}
