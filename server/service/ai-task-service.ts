import { aiProvider } from '../lib/ai/provider'
import { taskStore } from '../lib/task-store'
import type { AnalysisTaskRecord, AnalyzeTaskInput } from '../types/ai-task'

class AITaskService {
  createTask(input: AnalyzeTaskInput) {
    const task = taskStore.createTask<AnalyzeTaskInput, AnalysisTaskRecord['result']>('ai-analysis', input)
    void this.processTask(task.taskId, input)
    return this.toResponse(task as AnalysisTaskRecord)
  }

  getTask(taskId: string) {
    const task = taskStore.getTask<AnalyzeTaskInput, AnalysisTaskRecord['result']>(taskId)
    if (!task || task.type !== 'ai-analysis') {
      return null
    }
    return this.toResponse(task as AnalysisTaskRecord)
  }

  private async processTask(taskId: string, input: AnalyzeTaskInput) {
    taskStore.updateTaskStatus(taskId, 'processing', { error: null })

    try {
      const result = await aiProvider.analyze(input)
      taskStore.updateTaskStatus(taskId, 'succeeded', {
        result,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 分析任务失败'
      taskStore.updateTaskStatus(taskId, 'failed', {
        error: message,
        result: null,
      })
    }
  }

  private toResponse(task: AnalysisTaskRecord) {
    return {
      taskId: task.taskId,
      type: task.type,
      status: task.status,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }
  }
}

export default new AITaskService()
