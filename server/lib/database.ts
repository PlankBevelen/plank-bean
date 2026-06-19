import type { DatabaseConfig, DatabaseStatus } from '../types/database'
import { databaseConfig } from '../config'

function maskDatabaseUrl(url: string) {
  if (!url) {
    return ''
  }

  return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@')
}

export function createDatabaseStatus(config: DatabaseConfig): DatabaseStatus {
  return {
    provider: config.provider,
    configured: Boolean(config.url),
    urlMasked: maskDatabaseUrl(config.url),
  }
}

export const databaseStatus = createDatabaseStatus(databaseConfig)

export async function initializeDatabase() {
  // 本轮只预留 PostgreSQL 接入层，不主动建立真实连接。
  return databaseStatus
}
