import { query } from '@solidjs/router'
import type { StoredStep } from './base'
import type { ExerciseContext, StepContext } from './context'

const getStorageId = (ctx: Omit<StepContext, 'position'>) =>
  `${ctx.url}:${ctx.sequenceId}:${ctx.sequencePosition}`

export default {
  fetchSequence: query(
    async (ctx: Omit<StepContext, 'position' | 'sequencePosition'>) => {
      const prefix = `${ctx.url}:${ctx.sequenceId}:`
      return Object.keys(localStorage)
        .filter((key) => key.startsWith(prefix))
        .flatMap((key) => {
          const sequencePosition = parseInt(key.slice(prefix.length))
          const steps = JSON.parse(localStorage.getItem(key) ?? '[]') as StoredStep[]
          return steps.map((step, position) => [sequencePosition, position, step] as const)
        })
        .reduce(
          (sequence, [sequencePosition, position, step]) => {
            sequence[sequencePosition] ??= {}
            sequence[sequencePosition][position] = step
            return sequence
          },
          {} as Record<number, Record<number, StoredStep>>,
        )
    },
    'fetchSequence-local',
  ),
  getProgress: query(async (ctx: Omit<StepContext, 'position' | 'sequencePosition'>) => {
    const prefix = `${ctx.url}:${ctx.sequenceId}:`
    return Object.fromEntries(
      Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix))
        .map((k) => {
          const exercise = JSON.parse(localStorage.getItem(k) ?? '[]')
          const answered = exercise.filter((part: StoredStep) => part.submitted)
          return [
            parseInt(k.split(':').at(-1)!),
            answered.length > 0 ? answered.every((part: StoredStep) => part.correct) : undefined,
          ]
        })
        .filter(([, correct]) => correct !== undefined),
    )
  }, 'getProgress-local'),
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
} as ExerciseContext
