export type AppEnvironment = 'development' | 'production'

export type AIProviderKind = 'unconfigured' | 'openai-compatible' | 'volcengine-ark'

export type ServerConfig = {
  env: AppEnvironment
  host: string
  port: number
  prefix: string
  corsOrigins: string[]
}

export type AIConfig = {
  provider: AIProviderKind
  apiBaseUrl: string
  apiKey: string
  analyzeModel: string
}
