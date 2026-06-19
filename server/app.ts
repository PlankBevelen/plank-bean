import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import compress from 'koa-compress'
import cors from '@koa/cors'
import helmet from 'koa-helmet'
import { serverConfig } from './config'
import { errorHandlerMiddleware } from './middleware/error-handler'
import { requestIdMiddleware } from './middleware/request-id'

export function createApp() {
  const app = new Koa()

  app.proxy = true

  app.use(errorHandlerMiddleware())
  app.use(requestIdMiddleware())
  app.use(helmet())
  app.use(cors({
    origin: (ctx) => {
      const requestOrigin = ctx.get('origin')
      if (serverConfig.corsOrigins.includes('*')) {
        return '*'
      }
      if (requestOrigin && serverConfig.corsOrigins.includes(requestOrigin)) {
        return requestOrigin
      }
      return serverConfig.corsOrigins[0] ?? '*'
    },
  }))
  app.use(compress())
  app.use(bodyParser())

  return app
}
