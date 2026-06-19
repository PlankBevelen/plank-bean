export const logger = {
  info(message: string, meta?: unknown) {
    console.info(`[server] ${message}`, meta ?? '')
  },
  warn(message: string, meta?: unknown) {
    console.warn(`[server] ${message}`, meta ?? '')
  },
  error(message: string, meta?: unknown) {
    console.error(`[server] ${message}`, meta ?? '')
  },
}
