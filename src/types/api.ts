import type {
  DetailProtectionLevel,
  PatternCellEdit,
  PatternGridSnapshot,
  PatternAnalysisFeatures,
  PatternParameterPatch,
  PatternProcessingOptions,
} from './bead-pattern'

export type ApiSuccessResponse<T> = {
  success: true
  message: string
  data: T
  requestId: string | null
}

export type ApiErrorResponse = {
  success: false
  message: string
  code: string
  details: unknown
  requestId: string | null
}

export type TaskStatus = 'pending' | 'processing' | 'succeeded' | 'failed'

export type AIAnomalyType = 'layout' | 'color-balance' | 'fidelity'
export type AIAnomalySeverity = 'low' | 'medium' | 'high'

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
  suggestedDetailProtectionLevel: DetailProtectionLevel
  anomalies: AIAnomalyItem[]
  optimizationOptions: AIOptimizationOption[]
}

export type AnalyzeTaskPayload = {
  imageSrc: string
  gridSize: number
  processingOptions: PatternProcessingOptions
  analysisFeatures: PatternAnalysisFeatures
  patternSnapshot?: PatternGridSnapshot
}

export type AnalysisTaskResponse = {
  taskId: string
  type: 'ai-analysis'
  status: TaskStatus
  result: AIAnalysisResult | null
  error: string | null
  createdAt: string
  updatedAt: string
}
