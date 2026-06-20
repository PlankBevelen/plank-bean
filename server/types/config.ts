export type AppEnvironment = 'development' | 'production'

export type ServerConfig = {
  env: AppEnvironment
  host: string
  port: number
  prefix: string
  corsOrigins: string[]
}
