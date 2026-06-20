import type { TaskRecord } from './task'

export type AnalyzeTaskInput = {
  imageSrc: string
  gridSize: number
  processingOptions: {
    targetColorCount: number
    denoise: boolean
    mergeSimilarColors: boolean
    preserveDetails: boolean
    cleanRareColors: boolean
    detailProtectionLevel: 'low' | 'medium' | 'high'
  }
  analysisFeatures: PatternAnalysisFeatures
  patternSnapshot?: PatternGridSnapshot
}

export type PatternAnalysisFeatures = {
  gridWidth: number
  gridHeight: number
  totalCells: number
  filledCellRatio: number
  emptyCellRatio: number
  edgeFillRatio: number
  leftRightBalanceDelta: number
  topBottomBalanceDelta: number
  dominantColorShare: number
  rareColorRatio: number
  uniqueColorCount: number
  outlineColorRatio: number
  horizontalTransitionRatio: number
  verticalTransitionRatio: number
  averageNeighborContrast: number
  detailDensityScore: number
  notes: string[]
}

export type AIAnomalyType = 'layout' | 'color-balance' | 'fidelity'
export type AIAnomalySeverity = 'low' | 'medium' | 'high'

export type PatternParameterPatch = {
  gridSize?: number
  processingOptions?: Partial<AnalyzeTaskInput['processingOptions']>
}

export type PatternCellEdit = {
  x: number
  y: number
  colorId: string
  reason: string
}

export type PatternGridSnapshot = {
  width: number
  height: number
  cells: Array<string | null>
}

export type AIAnomalyItem = {
  id: string
  type: AIAnomalyType
  title: string
  severity: AIAnomalySeverity
  description: string
  impact: string
  evidence: string
}

export type AIOptimizationOption = {
  id: string
  title: string
  summary: string
  targetAnomalyIds: string[]
  patch: PatternParameterPatch
  cellEdits: PatternCellEdit[]
  expectedBenefits: string[]
  risks: string[]
  beforeSummary: string
  afterSummary: string
}

export type AIAnalysisResult = {
  summary: string
  confidenceScore: number
  suggestedDetailProtectionLevel: 'low' | 'medium' | 'high'
  anomalies: AIAnomalyItem[]
  optimizationOptions: AIOptimizationOption[]
}

export type AnalysisTaskRecord = TaskRecord<AnalyzeTaskInput, AIAnalysisResult>
