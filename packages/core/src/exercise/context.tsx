import { query } from '@solidjs/router'
import { createContext, type Accessor } from 'solid-js'
import type { StoredStep } from './base'
import * as remote from './context.remote'

export type StepContext = {
  url: string
  sequenceId: string
  sequencePosition: number
  position: number
}

export const StepContext = createContext<Accessor<StepContext> | null>(null)

export type ExerciseContext = {
  fetchStep: (ctx: StepContext) => Promise<StoredStep | null>
  getProgress: (ctx: StepContext) => Promise<Record<number, boolean | null | undefined>>
  saveStep: (ctx: StepContext, step: StoredStep) => Promise<void>
}

const getStorageId = (ctx: StepContext) => `${ctx.url}:${ctx.sequenceId}:${ctx.sequencePosition}`

export const ExerciseContext = createContext<ExerciseContext>({
  fetchStep: query(async (ctx: StepContext) => {
    try {
      return await remote.fetchStep(ctx)
    } catch {
      const id = getStorageId(ctx)
      const stored = JSON.parse(localStorage.getItem(id) ?? '[]')
      return stored[ctx.position] ?? null
    }
  }, 'fetchStep'),
  getProgress: query(async (ctx: StepContext) => {
    try {
      return await remote.getProgress(ctx)
    } catch {
      const prefix = `${ctx.url}:${ctx.sequenceId}:`
      return Object.fromEntries(
        Object.keys(localStorage)
          .filter((k) => k.startsWith(prefix))
          .map((k) => {
            const exercise = JSON.parse(localStorage.getItem(k) ?? '[]')
            return [
              parseInt(k.split(':').at(-1)!),
              exercise.every((part: StoredStep) => part.correct),
            ]
          }),
      )
    }
  }, 'getProgress'),
  saveStep: async (ctx: StepContext, step: StoredStep) => {
    try {
      await remote.saveStep(ctx, step)
    } catch {
      const id = getStorageId(ctx)
      const stored = JSON.parse(localStorage.getItem(id) ?? '[]')
      if (ctx.position >= stored.length) stored.push(step)
      else stored[ctx.position] = step
      localStorage.setItem(id, JSON.stringify(stored))
    }
  },
})
