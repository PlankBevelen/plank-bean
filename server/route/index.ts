import Koa from 'koa'
import Router from '@koa/router'
import { serverConfig } from '../config'
import { notFoundMiddleware } from '../middleware/not-found'
import aiTaskRouter from './modules/ai-task'
import healthRouter from './modules/health'

export function registerRoutes(app: Koa) {
  const apiRouter = new Router({
    prefix: serverConfig.prefix,
  })

  apiRouter.use(aiTaskRouter.routes(), aiTaskRouter.allowedMethods())
  apiRouter.use(healthRouter.routes(), healthRouter.allowedMethods())

  app.use(apiRouter.routes())
  app.use(apiRouter.allowedMethods())
  app.use(notFoundMiddleware())
}
