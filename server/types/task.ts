export type TaskType = 'ai-analysis'
export type TaskStatus = 'pending' | 'processing' | 'succeeded' | 'failed'

export type TaskRecord<TInput, TResult> = {
  taskId: string
  type: TaskType
  status: TaskStatus
  input: TInput
  result: TResult | null
  error: string | null
  createdAt: string
  updatedAt: string
}
