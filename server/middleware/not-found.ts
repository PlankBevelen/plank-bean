import type { Middleware } from 'koa'
import { sendError } from '../utils/response'

export function notFoundMiddleware(): Middleware {
  return async (ctx, next) => {
    await next()

    if (ctx.status === 404 && ctx.body == null) {
      sendError(ctx, `未找到路由: ${ctx.method} ${ctx.path}`, 404, 'NOT_FOUND')
    }
  }
}
