import type Koa from 'koa'
import { getHealthSnapshot } from '../service/health-service'
import { sendSuccess } from '../utils/response'

export async function getHealth(ctx: Koa.Context) {
  sendSuccess(ctx, getHealthSnapshot(), '服务运行正常')
}
