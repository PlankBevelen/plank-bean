import type { ServerConfig } from '../types/config'
import type { DatabaseConfig } from '../types/database'
import { readEnv, readListEnv, readNumberEnv, readOptionalEnv } from './env'

const env = process.env.NODE_ENV === 'production' ? 'production' : 'development'

export const serverConfig: ServerConfig = {
  env,
  host: readEnv('SERVER_HOST', '127.0.0.1'),
  port: readNumberEnv('SERVER_PORT', 4000),
  prefix: readEnv('SERVER_PREFIX', '/api'),
  corsOrigins: readListEnv('CORS_ORIGIN', ['http://127.0.0.1:5173', 'http://localhost:5173']),
}

export const databaseConfig: DatabaseConfig = {
  provider: 'postgresql',
  url: readOptionalEnv('DATABASE_URL', ''),
}
