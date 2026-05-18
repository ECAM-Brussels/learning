import { Pagination } from '@learning/components/Pagination'
import { Dynamic } from '@solidjs/web'
import { range } from 'es-toolkit'
import { createMemo, refresh, type Component } from 'solid-js'
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
  const next = createMemo(props.next)
  const progress = createMemo(() => {
    return keys().map((k) => {
      const exercise = JSON.parse(localStorage.getItem(k) ?? 'null')
      return (
        exercise.attempt.every((part: any) => part.correct) &&
        exercise.attempt.at(-1)?.next === null
      )
    })
  })
  return (
    <Pagination progress={progress()}>
      {range(keys().length + 1).map((i) => () => (
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
      ))}
    </Pagination>
  )
}
