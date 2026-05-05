import { Dynamic } from '@solidjs/web'
import { createMemo, createProjection, refresh, Repeat, type Component } from 'solid-js'
import { ExerciseContext } from './base'

type Props<T extends object> = {
  id?: string
  exercise: Component<T>
  next: () => T | Promise<T>
}
export function Practice<T extends object>(props: Props<T>) {
  const prefix = () =>
    `practice:${window.location.pathname}:${window.location.search}:${props.id ?? ''}:`
  const key = (i: number) => `${prefix()}${i}`
  const keys = createMemo(() => Object.keys(localStorage).filter((k) => k.startsWith(prefix())))
  return (
    <Repeat count={keys().length + 1}>
      {(i) => {
        const data = createProjection(() => props.next())
        return (
          <ExerciseContext
            value={{
              fetch: () => JSON.parse(localStorage.getItem(key(i)) ?? 'null'),
              save: (_id, exercise) => {
                localStorage.setItem(key(i), JSON.stringify(exercise))
                refresh(keys)
              },
            }}
          >
            <Dynamic component={props.exercise} {...data} />
          </ExerciseContext>
        )
      }}
    </Repeat>
  )
}
