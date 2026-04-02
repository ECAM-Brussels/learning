import { createContext, createStore, useContext } from 'solid-js'

export type ContextType = {
  readOnly?: boolean
  state: Record<string, any>
  setState: ReturnType<typeof createStore<Record<string, any>>>[1]
}

export const ExerciseContext = createContext<ContextType>()

export function useExerciseContext() {
  return useContext(ExerciseContext)
}
