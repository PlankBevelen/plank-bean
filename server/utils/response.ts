import type Koa from 'koa'

export function sendSuccess<T>(
  ctx: Koa.Context,
  data: T,
  message = 'ok',
  status = 200,
) {
  ctx.status = status
  ctx.body = {
    success: true,
    message,
    data,
    requestId: ctx.state.requestId ?? null,
  }
}

export function sendError(
  ctx: Koa.Context,
  message: string,
  status = 500,
  code = 'INTERNAL_SERVER_ERROR',
  details?: unknown,
) {
  ctx.status = status
  ctx.body = {
    success: false,
    message,
    code,
    details: details ?? null,
    requestId: ctx.state.requestId ?? null,
  }
}
