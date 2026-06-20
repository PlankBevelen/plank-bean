export type ApiSuccessResponse<T> = {
  success: true
  message: string
  data: T
  requestId: string | null
}

export type ApiErrorResponse = {
  success: false
  message: string
  code: string
  details: unknown
  requestId: string | null
}
