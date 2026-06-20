import Router from '@koa/router'
import { createAnalyzeTask, getAnalyzeTask } from '../../controller/ai-task-controller'

const aiTaskRouter = new Router()

aiTaskRouter.post('/ai-tasks/analyze', createAnalyzeTask)
aiTaskRouter.get('/ai-tasks/:taskId', getAnalyzeTask)

export default aiTaskRouter
