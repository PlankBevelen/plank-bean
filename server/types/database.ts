export type DatabaseProvider = 'postgresql'

export type DatabaseConfig = {
  provider: DatabaseProvider
  url: string
}

export type DatabaseStatus = {
  provider: DatabaseProvider
  configured: boolean
  urlMasked: string
}
