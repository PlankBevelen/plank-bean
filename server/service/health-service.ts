import { serverConfig } from '../config'
import { databaseStatus } from '../lib/database'

export function getHealthSnapshot() {
  return {
    status: 'ok',
    env: serverConfig.env,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: databaseStatus,
  }
}
