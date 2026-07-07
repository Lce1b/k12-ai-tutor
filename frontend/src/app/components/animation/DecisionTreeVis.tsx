"use client"

import { useCallback } from "react"
import type { DecisionTreeConfig, TreeNodeData } from "./types"

interface Props { config: DecisionTreeConfig }

export default function DecisionTreeVis({ config }: Props) {
  const tree = config.tree

  const drawNode = useCallback((node: TreeNodeData, depth: number, x: number, maxDepth: number, totalWidth: number) => {
    const y = depth * 80 + 20
    const isLeaf = node.isLeaf || (!node.children || node.children.length === 0)

    if (isLeaf) {
      return (
        <g key={`${node.label}-${x}-${y}`}>
          <rect x={x - 50} y={y} width={100} height={40} rx={20} fill="#22c55e" opacity={0.2} stroke="#22c55e" strokeWidth={1.5} />
          <text x={x} y={y + 18} textAnchor="middle" fill="#15803d" fontSize={11} fontWeight={600}>{node.label}</text>
          <text x={x} y={y + 32} textAnchor="middle" fill="#22c55e" fontSize={9}>{node.result ?? ""}</text>
        </g>
      )
    }

    const children = node.children ?? []
    const childSpacing = totalWidth / (2 ** (depth + 1))

    return (
      <g key={`${node.label}-${x}-${y}`}>
        {/* Edges */}
        {children.map((child, i) => {
          const childX = x - totalWidth / (2 ** (depth + 2)) + i * childSpacing
          return (
            <line key={`edge-${i}`} x1={x} y1={y + 40} x2={childX} y2={(depth + 1) * 80 + 20}
              stroke="#94a3b8" strokeWidth={1.5} />
          )
        })}
        {/* Node */}
        <rect x={x - 55} y={y} width={110} height={40} rx={8} fill="#6366f1" opacity={0.15} stroke="#6366f1" strokeWidth={1.5} />
        <text x={x} y={y + 24} textAnchor="middle" fill="#4f46e5" fontSize={11} fontWeight={600}>{node.label}</text>
        {/* Children */}
        {children.map((child, i) => {
          const childX = x - totalWidth / (2 ** (depth + 2)) + i * childSpacing
          return drawNode(child, depth + 1, childX, maxDepth, totalWidth)
        })}
      </g>
    )
  }, [])

  function getMaxDepth(node: TreeNodeData): number {
    const children = node.children ?? []
    if (children.length === 0) return 1
    return 1 + Math.max(...children.map(getMaxDepth))
  }

  const maxDepth = getMaxDepth(tree)
  const totalWidth = 500
  const totalHeight = maxDepth * 80 + 40

  return (
    <div className="flex flex-col items-center p-4 overflow-x-auto">
      <svg width={totalWidth} height={totalHeight} className="min-w-[500px]">
        {drawNode(tree, 0, totalWidth / 2, maxDepth, totalWidth)}
      </svg>
      <p className="text-xs text-slate-400 mt-2">
        <span className="text-indigo-500">■</span> 决策节点 <span className="text-green-500 ml-2">■</span> 叶节点（结果）
      </p>
    </div>
  )
}
