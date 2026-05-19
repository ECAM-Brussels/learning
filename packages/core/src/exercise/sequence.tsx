import Pagination from '@learning/components/Pagination'
import { Dynamic } from '@solidjs/web'
import { range } from 'es-toolkit'
import { createMemo, refresh, type Component, type JSX } from 'solid-js'
import { ExerciseContext } from './base'

type Props = {
  id: string
} & (
  | {
      next: Component<{ position: number; progress: (boolean | null | undefined)[] }>
    }
  | {
      children: JSX.Element[]
    }
)

/**
 * Create a sequence of exercises
 *
 * There are two ways to use this component:
 *
 * 1. By statically predefining the sequence via children
 * 2. By dynamically generating the next exercise via the `next` prop,
 *    which takes a component that receives the current position and progress of the sequence.
 *
 * @example
 * <ExerciseSequence id="predefined">
 *   <Factor expr="x^2 - 5x + 6" />
 *   <Factor expr="x^2 - 3x + 2" />
 *   <Factor expr="x^2 - x - 6" />
 * </ExerciseSequence>
 *
 * @example
 * <ExerciseSequence
 *   id="generated"
 *   next={() => {
 *     const x1 = sample([1, 2, 3, 4, 5, 6])
 *     const x2 = sample([1, 2, 3, 4, 5, 6])
 *     const exercise = createMemo(() => expr(`(x - ${x1}) (x - ${x2})`).expand().latex())
 *     return <Factor expr={exercise()} />
 *   }}
 * />
 */
export function Sequence(props: Props) {
  const prefix = () =>
    `sequence:${window.location.pathname}:${window.location.search}:${props.id ?? ''}:`
  const key = (i: number) => `${prefix()}:${i}`
  const keys = createMemo(() => Object.keys(localStorage).filter((k) => k.startsWith(prefix())))
  const length = createMemo(() => ('children' in props ? props.children.length : keys().length + 1))
  const progress = createMemo(() => {
    return range(length()).map((k) => {
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
      {range(length()).map((i) => () => (
        <ExerciseContext
          value={{
            fetch: () => JSON.parse(localStorage.getItem(key(i)) ?? 'null'),
            save: (_id, exercise) => {
              localStorage.setItem(key(i), JSON.stringify(exercise))
              refresh(() => {
                keys()
                progress()
              })
            },
            reset: () => localStorage.removeItem(key(i)),
          }}
        >
          {'children' in props ? (
            props.children[i]
          ) : (
            <Dynamic component={props.next} position={i} progress={progress()} />
          )}
        </ExerciseContext>
      ))}
    </Pagination>
  )
}
