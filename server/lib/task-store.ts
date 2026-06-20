import { randomUUID } from 'node:crypto'
import type { TaskRecord, TaskStatus, TaskType } from '../types/task'

class TaskStore {
  private readonly store = new Map<string, TaskRecord<unknown, unknown>>()

  createTask<TInput, TResult>(type: TaskType, input: TInput) {
    const now = new Date().toISOString()
    const task: TaskRecord<TInput, TResult> = {
      taskId: randomUUID(),
      type,
      status: 'pending',
      input,
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    }
    this.store.set(task.taskId, task as TaskRecord<unknown, unknown>)
    return task
  }

  getTask<TInput, TResult>(taskId: string) {
    return (this.store.get(taskId) ?? null) as TaskRecord<TInput, TResult> | null
  }

  updateTaskStatus<TInput, TResult>(taskId: string, status: TaskStatus, patch?: {
    result?: TResult | null
    error?: string | null
  }) {
    const current = this.getTask<TInput, TResult>(taskId)
    if (!current) {
      return null
    }

    const next: TaskRecord<TInput, TResult> = {
      ...current,
      status,
      result: patch?.result ?? current.result,
      error: patch?.error ?? current.error,
      updatedAt: new Date().toISOString(),
    }

    this.store.set(taskId, next as TaskRecord<unknown, unknown>)
    return next
  }
}

export const taskStore = new TaskStore()
