import Pagination from '@learning/components/Pagination'
import { range } from 'es-toolkit'
import { createMemo, refresh, type JSX } from 'solid-js'
import { ExerciseContext } from './base'

type Props = {
  id?: string
  children: JSX.Element[]
}

export function ExerciseSequence(props: Props) {
  const key = (i: number) =>
    `sequence:${window.location.pathname}:${window.location.search}:${props.id ?? ''}:${i}`
  const progress = createMemo(() => {
    return range(props.children.length).map((k) => {
      try {
        const exercise = JSON.parse(localStorage.getItem(key(k)) ?? 'null')
        return (
          exercise.attempt.every((part: any) => part.correct) &&
          exercise.attempt.at(-1)?.next === null
        )
      } catch {
        return null
      }
    })
  })
  return (
    <Pagination progress={progress()}>
      {range(props.children.length).map((i) => () => (
        <ExerciseContext
          value={{
            fetch: () => JSON.parse(localStorage.getItem(key(i)) ?? 'null'),
            save: (_id, exercise) => {
              localStorage.setItem(key(i), JSON.stringify(exercise))
              refresh(() => progress())
            },
            reset: () => localStorage.removeItem(key(i)),
          }}
        >
          {props.children[i]}
        </ExerciseContext>
      ))}
    </Pagination>
  )
}
