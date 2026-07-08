/**
 * AnimationConfig — shared types for LLM-generated JSON animation configs.
 * The LLM outputs one of these shapes; the frontend AnimationRenderer
 * maps `type` to the corresponding pre-built React component.
 */

// ── Base ──
export type AnimationType = "neural_network" | "gradient_descent" | "sorting" | "decision_tree" | "kmeans" | "generic"

export interface AnimationConfig {
  type: AnimationType
  title?: string
  message?: string  // hint shown when topic doesn't match perfectly
}

// ── Neural Network ──
export interface NeuralNetworkConfig extends AnimationConfig {
  type: "neural_network"
  layers: number[]           // e.g. [2, 4, 3, 1] = 2 inputs, 1 hidden(4), 1 hidden(3), 1 output
  activations?: string[]     // e.g. ["relu", "relu", "sigmoid"]
  showWeights?: boolean
  animateForward?: boolean
}

// ── Gradient Descent ──
export interface GradientDescentConfig extends AnimationConfig {
  type: "gradient_descent"
  function?: "bowl" | "saddle" | "himmelblau" | "rosenbrock" | "wavy"
  startPoint?: [number, number]
  learningRate?: number
  steps?: number
}

// ── Sorting ──
export type SortAlgorithm = "bubble" | "selection" | "quick" | "merge" | "insertion"

export interface SortingConfig extends AnimationConfig {
  type: "sorting"
  algorithm?: SortAlgorithm
  arraySize?: number
  speed?: "slow" | "normal" | "fast"
}

// ── Decision Tree ──
export interface TreeNodeData {
  label: string
  children?: TreeNodeData[]
  isLeaf?: boolean
  result?: string       // leaf classification result
}

export interface DecisionTreeConfig extends AnimationConfig {
  type: "decision_tree"
  tree: TreeNodeData
}

// ── K-Means Clustering ──
export interface KMeansConfig extends AnimationConfig {
  type: "kmeans"
  clusters?: number
  points?: number
  iterations?: number
}

// ── Generic (fallback for non-AI topics) ──
export interface GenericConfig extends AnimationConfig {
  type: "generic"
  particles?: number
  topicText?: string
}

export type AnyAnimationConfig =
  | NeuralNetworkConfig
  | GradientDescentConfig
  | SortingConfig
  | DecisionTreeConfig
  | KMeansConfig
  | GenericConfig
