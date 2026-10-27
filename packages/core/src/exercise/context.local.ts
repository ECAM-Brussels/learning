import { query } from '@solidjs/router'
import type { StoredStep } from './base'
import type { ExerciseContext, StepContext } from './context'

const getStorageId = (ctx: Omit<StepContext, 'position'>) =>
  `${ctx.url}:${ctx.sequenceId}:${ctx.sequencePosition}`

export default {
  fetchSequence: query(async (ctx: Omit<StepContext, 'position' | 'sequencePosition'>) => {
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
  }, 'fetchSequence-local'),
  getProgress: query(async (ctx: Omit<StepContext, 'position' | 'sequencePosition'>) => {
    const prefix = `${ctx.url}:${ctx.sequenceId}:`
    return Object.fromEntries(
      Object.keys(localStorage)
        .filter((k) => k.startsWith(prefix))
        .map((k) => {
          const exercise = JSON.parse(localStorage.getItem(k) ?? '[]')
          const filledIn = exercise.filter((part: StoredStep) => part.submitted)
          const index = parseInt(k.split(':').at(-1)!)
          let correct: boolean | null | undefined
          if (filledIn.length === 0) correct = null
          else if (exercise.some((part: StoredStep) => part.correct === false)) correct = false
          else if (exercise.some((part: StoredStep) => part.correct === null)) correct = null
          else correct = true
          return [index, correct]
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
    const stored = JSON.parse(localStorage.getItem(id) ?? '[]')
    const firstStep = { ...stored[0], submitted: false, feedback: {}, correct: undefined }
    localStorage.setItem(id, JSON.stringify([firstStep]))
  },
} as ExerciseContext
