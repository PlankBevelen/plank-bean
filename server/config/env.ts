import { config as loadEnv } from 'dotenv'

loadEnv()

export function readEnv(key: string, fallback?: string) {
  const value = process.env[key] ?? fallback
  if (value === undefined || value === '') {
    throw new Error(`缺少环境变量: ${key}`)
  }
  return value
}

export function readOptionalEnv(key: string, fallback = '') {
  return process.env[key] ?? fallback
}

export function readNumberEnv(key: string, fallback: number) {
  const raw = process.env[key]
  if (raw === undefined || raw === '') {
    return fallback
  }

  const value = Number(raw)
  if (Number.isNaN(value)) {
    throw new Error(`环境变量 ${key} 不是有效数字`)
  }
  return value
}

export function readListEnv(key: string, fallback: string[]) {
  const raw = process.env[key]
  if (!raw) {
    return fallback
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
