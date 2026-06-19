import type Koa from 'koa'
import { logger } from '../utils/logger'
import { sendError } from '../utils/response'

export function errorHandlerMiddleware(): Koa.Middleware {
  return async (ctx, next) => {
    try {
      await next()
    } catch (error) {
      const err = error as { status?: number, code?: string, message?: string, details?: unknown }
      const status = err.status ?? 500
      const message = err.message ?? '服务器内部错误'
      const code = err.code ?? 'INTERNAL_SERVER_ERROR'

      logger.error('请求处理失败', {
        requestId: ctx.state.requestId ?? null,
        path: ctx.path,
        status,
        code,
        message,
      })

      sendError(ctx, message, status, code, err.details)
    }
  }
}
