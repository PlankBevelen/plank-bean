import type { AIConfig, ServerConfig } from '../types/config'
import type { DatabaseConfig } from '../types/database'
import {
  readEnv,
  readListEnv,
  readNumberEnv,
  readOptionalEnv,
  readOptionalEnvFromKeys,
} from './env'

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

const aiProvider = readOptionalEnv('AI_PROVIDER', 'unconfigured') as AIConfig['provider']
const isVolcengineArk = aiProvider === 'volcengine-ark'

export const aiConfig: AIConfig = {
  provider: aiProvider,
  apiBaseUrl: isVolcengineArk
    ? readOptionalEnvFromKeys(
      ['AI_API_BASE_URL', 'ARK_BASE_URL'],
      'https://ark.cn-beijing.volces.com/api/v3',
    )
    : readOptionalEnv('AI_API_BASE_URL', ''),
  apiKey: isVolcengineArk
    ? readOptionalEnvFromKeys(['ARK_API_KEY', 'AI_API_KEY'], '')
    : readOptionalEnv('AI_API_KEY', ''),
  analyzeModel: isVolcengineArk
    ? readOptionalEnvFromKeys(['AI_MODEL_ANALYZE', 'ARK_MODEL_ANALYZE', 'ARK_MODEL'], '')
    : readOptionalEnv('AI_MODEL_ANALYZE', ''),
}
