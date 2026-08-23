import { createContext, type Accessor } from 'solid-js'
import type { StoredStep } from './base'

export type StepContext = {
  url: string
  sequenceId: string
  sequencePosition: number
  position: number
}

export const StepContext = createContext<Accessor<StepContext> | null>(null)

export type ExerciseContext = {
  fetchStep: (ctx: StepContext) => Promise<StoredStep | null>
  getProgress: (
    ctx: Omit<StepContext, 'position' | 'sequencePosition'>,
  ) => Promise<Record<number, boolean | null | undefined>>
  saveStep: (ctx: StepContext, step: StoredStep) => Promise<void>
  reset: (ctx: Omit<StepContext, 'position'>) => Promise<void>
  getStats?: (
    ctx: Omit<StepContext, 'position'>,
  ) => Promise<{ email: string; name: string; progress: (boolean | null)[] }[]>
}
