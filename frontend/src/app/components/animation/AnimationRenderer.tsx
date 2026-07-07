"use client"

import NeuralNetworkVis from "./NeuralNetworkVis"
import GradientDescentVis from "./GradientDescentVis"
import SortingVis from "./SortingVis"
import DecisionTreeVis from "./DecisionTreeVis"
import KMeansVis from "./KMeansVis"
import type { AnyAnimationConfig } from "./types"

interface Props {
  config: AnyAnimationConfig
}

export default function AnimationRenderer({ config }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-slate-200 dark:border-slate-700">
        <span className="text-lg">{iconFor(config.type)}</span>
        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
          {config.title || titleFor(config.type)}
        </span>
      </div>
      <div className="min-h-[400px] bg-slate-50 dark:bg-slate-900/30">
        {renderAnimation(config)}
      </div>
    </div>
  )
}

function iconFor(type: string) {
  const icons: Record<string, string> = {
    neural_network: "🧠",
    gradient_descent: "📉",
    sorting: "📊",
    decision_tree: "🌳",
    kmeans: "🎯",
  }
  return icons[type] ?? "🎬"
}

function titleFor(type: string) {
  const titles: Record<string, string> = {
    neural_network: "神经网络动画",
    gradient_descent: "梯度下降动画",
    sorting: "排序算法动画",
    decision_tree: "决策树动画",
    kmeans: "K-Means 聚类动画",
  }
  return titles[type] ?? "动画演示"
}

function renderAnimation(config: AnyAnimationConfig) {
  switch (config.type) {
    case "neural_network":
      return <NeuralNetworkVis config={config} />
    case "gradient_descent":
      return <GradientDescentVis config={config} />
    case "sorting":
      return <SortingVis config={config} />
    case "decision_tree":
      return <DecisionTreeVis config={config} />
    case "kmeans":
      return <KMeansVis config={config} />
    default:
      return (
        <div className="p-8 text-center text-slate-400">
          暂不支持此动画类型
        </div>
      )
  }
}
