import type { ApiErrorResponse, ApiSuccessResponse } from '../types'

type HttpQuery = Record<string, string | number | boolean | undefined | null>

type RequestOptions = {
  params?: HttpQuery
  signal?: AbortSignal
}

class HttpError extends Error {
  status: number
  code: string
  details: unknown
  requestId: string | null

  constructor(response: ApiErrorResponse, status: number) {
    super(response.message)
    this.name = 'HttpError'
    this.status = status
    this.code = response.code
    this.details = response.details
    this.requestId = response.requestId
  }
}

function buildUrl(path: string, params?: HttpQuery) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${normalizedBase}${normalizedPath}`, window.location.origin)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  if (/^https?:\/\//.test(normalizedBase)) {
    return `${normalizedBase}${normalizedPath}${url.search}`
  }

  return `${normalizedBase}${normalizedPath}${url.search}`
}

async function handleResponse<T>(response: Response): Promise<T> {
  const payload = await response.json() as ApiSuccessResponse<T> | ApiErrorResponse

  if (!response.ok || !payload.success) {
    if ('success' in payload && payload.success === false) {
      throw new HttpError(payload, response.status)
    }
    throw new Error('请求失败')
  }

  return payload.data
}

class HttpClient {
  private readonly timeout = 20000

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown, options: RequestOptions = {}) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), this.timeout)

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    try {
      const response = await fetch(buildUrl(path, options.params), {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      })

      return await handleResponse<T>(response)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('请求超时或已取消', { cause: error })
      }
      throw error
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  get<T>(path: string, params?: HttpQuery, options?: Omit<RequestOptions, 'params'>) {
    return this.request<T>('GET', path, undefined, {
      ...options,
      params,
    })
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'params'>) {
    return this.request<T>('POST', path, body, options)
  }
}

const http = new HttpClient()

export { HttpError }
export default http
