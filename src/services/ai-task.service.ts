import type { AnalysisTaskResponse, AnalyzeTaskPayload } from '../types'
import http from '../utils/http'

class AiTaskService {
  createAnalyzeTask(payload: AnalyzeTaskPayload) {
    return http.post<AnalysisTaskResponse>('/ai-tasks/analyze', payload)
  }

  getAnalyzeTask(taskId: string) {
    return http.get<AnalysisTaskResponse>(`/ai-tasks/${taskId}`)
  }
}

export default new AiTaskService()
