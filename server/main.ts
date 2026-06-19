import { createApp } from './app'
import { serverConfig } from './config'
import { initializeDatabase } from './lib/database'
import { registerRoutes } from './route'
import { logger } from './utils/logger'

const app = createApp()
registerRoutes(app)

const database = await initializeDatabase()
logger.info('数据库接入层已初始化', database)

const server = app.listen(serverConfig.port, serverConfig.host, () => {
  logger.info(`Koa 服务启动成功: http://${serverConfig.host}:${serverConfig.port}${serverConfig.prefix}`)
})

server.on('error', (error) => {
  logger.error('Koa 服务启动失败', error)
  process.exitCode = 1
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info(`收到 ${signal}，开始关闭服务`)
    server.close(() => {
      logger.info('服务已安全关闭')
      process.exit(0)
    })
  })
}
