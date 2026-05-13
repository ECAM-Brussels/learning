import { Dynamic } from '@solidjs/web'
import { createMemo, refresh, Repeat, type Component } from 'solid-js'
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
  const keys = createMemo(() =>
    Object.keys(localStorage).filter((k) => {
      if (!k.startsWith(prefix())) return false
      const stored = JSON.parse(localStorage.getItem(k) ?? 'null')
      return stored.attempt.length > 1
    }),
  )
  const next = createMemo(props.next)
  return (
    <Repeat count={keys().length + 1}>
      {(i) => {
        return (
          <ExerciseContext
            value={{
              fetch: () => JSON.parse(localStorage.getItem(key(i)) ?? 'null'),
              save: (_id, exercise) => {
                localStorage.setItem(key(i), JSON.stringify(exercise))
                refresh(() => {
                  keys()
                  next()
                })
              },
            }}
          >
            <Dynamic component={props.exercise} {...next()} />
          </ExerciseContext>
        )
      }}
    </Repeat>
  )
}
