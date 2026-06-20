import { randomUUID } from 'node:crypto'
import type { Middleware } from 'koa'

export function requestIdMiddleware(): Middleware {
  return async (ctx, next) => {
    const requestId = randomUUID()
    ctx.state.requestId = requestId
    ctx.set('X-Request-Id', requestId)
    await next()
  }
}
