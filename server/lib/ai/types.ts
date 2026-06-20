import type { AIConfig } from '../../types/config'
import type { AIAnalysisResult, AnalyzeTaskInput } from '../../types/ai-task'

export type AIProviderContext = {
  config: AIConfig
}

export interface AIProvider {
  analyze(input: AnalyzeTaskInput): Promise<AIAnalysisResult>
}
