import type { StoredStep } from './base'
import type { ExerciseContext, StepContext } from './context'

const getStorageId = (ctx: Omit<StepContext, 'position'>) =>
  `${ctx.url}:${ctx.sequenceId}:${ctx.sequencePosition}`

export default {
  fetchStep: async (ctx: StepContext) => {
    const id = getStorageId(ctx)
    const stored = JSON.parse(localStorage.getItem(id) ?? '[]')
    return stored[ctx.position] ?? null
  },
  getProgress: async (ctx: Omit<StepContext, 'position' | 'sequencePosition'>) => {
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
  },
  saveStep: async (ctx: StepContext, step: StoredStep) => {
    const id = getStorageId(ctx)
    const stored = JSON.parse(localStorage.getItem(id) ?? '[]')
    if (ctx.position >= stored.length) stored.push(step)
    else stored[ctx.position] = step
    localStorage.setItem(id, JSON.stringify(stored))
  },
  reset: async (ctx: Omit<StepContext, 'position'>) => {
    const id = getStorageId(ctx)
    localStorage.removeItem(id)
  },
} satisfies ExerciseContext
