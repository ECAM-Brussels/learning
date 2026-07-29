import { createContext, type Accessor } from 'solid-js'
import type { StoredStep } from './base'

type MaybeAsync<T> = T | Promise<T>

export type StepContext = {
  url: string
  sequenceId: string
  sequencePosition: number
  position: number
}

export const StepContext = createContext<Accessor<StepContext> | null>(null)

export type ExerciseContext = {
  fetchStep: (ctx: StepContext) => MaybeAsync<StoredStep | null>
  getProgress: (ctx: StepContext) => MaybeAsync<(boolean | null)[]>
  saveStep: (ctx: StepContext, step: StoredStep) => MaybeAsync<void>
}

const getStorageId = (ctx: StepContext) => `${ctx.url}:${ctx.sequenceId}:${ctx.sequencePosition}`

export const ExerciseContext = createContext<ExerciseContext>({
  fetchStep: (ctx) => {
    const id = getStorageId(ctx)
    const stored = JSON.parse(localStorage.getItem(id) ?? '[]')
    return stored[ctx.position] ?? null
  },
  getProgress: (ctx) => {
    const prefix = `${ctx.url}:${ctx.sequenceId}:`
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .map((k) => {
        const exercise = JSON.parse(localStorage.getItem(k) ?? '[]')
        return exercise.every((part: StoredStep) => part.correct)
      })
  },
  saveStep: (ctx, step) => {
    const id = getStorageId(ctx)
    const stored = JSON.parse(localStorage.getItem(id) ?? '[]')
    if (ctx.position >= stored.length) stored.push(step)
    else stored[ctx.position] = step
    localStorage.setItem(id, JSON.stringify(stored))
  },
})
