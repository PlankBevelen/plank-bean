import type { Context } from 'koa'
import type { AnalyzeTaskInput } from '../types/ai-task'
import aiTaskService from '../service/ai-task-service'
import { sendSuccess } from '../utils/response'

export async function createAnalyzeTask(ctx: Context) {
  const payload = ctx.request.body as Partial<AnalyzeTaskInput>

  if (!payload.imageSrc || typeof payload.imageSrc !== 'string') {
    ctx.throw(400, '缺少有效的 imageSrc')
  }
  if (!payload.processingOptions) {
    ctx.throw(400, '缺少 processingOptions')
  }
  if (!payload.analysisFeatures || typeof payload.analysisFeatures !== 'object') {
    ctx.throw(400, '缺少 analysisFeatures')
  }

  const task = aiTaskService.createTask({
    imageSrc: payload.imageSrc,
    gridSize: typeof payload.gridSize === 'number' ? payload.gridSize : 48,
    processingOptions: payload.processingOptions,
    analysisFeatures: payload.analysisFeatures,
    patternSnapshot: payload.patternSnapshot,
  })

  sendSuccess(ctx, task, 'AI 分析任务已创建', 202)
}

export async function getAnalyzeTask(ctx: Context) {
  const task = aiTaskService.getTask(ctx.params.taskId)
  if (!task) {
    ctx.throw(404, '未找到对应的 AI 分析任务')
  }
  sendSuccess(ctx, task, '查询成功')
}
