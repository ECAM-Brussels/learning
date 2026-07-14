import { Pagination, Scope } from '@learning/components'
import { useLocation } from '@solidjs/router'
import { Dynamic, type JSX } from '@solidjs/web'
import { range } from 'es-toolkit'
import { createMemo, refresh, type Component } from 'solid-js'
import { ExerciseContext } from './base'

type Props<T extends object> = {
  id: string
} & (
  | {
      exercise: Component<T>
      next: (props: {
        position: number
        progress: (boolean | null | undefined)[]
      }) => Promise<T> | T
    }
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
 *    Alternatively, `next` can generate only the props,
 *    and the exercise component can be specified via the `exercise` prop.
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
 *     const exercise = createMemo(() => {
 *       const x1 = sample([1, 2, 3, 4, 5, 6])
 *       const x2 = sample([1, 2, 3, 4, 5, 6])
 *       return expr(`(x - ${x1}) (x - ${x2})`).expand().latex()
 *     })
 *     return <Factor expr={exercise()} />
 *   }}
 * />
 *
 * @example
 * <Sequence
 *   id="generated"
 *   exercise={Factor}
 *   next={async () => {
 *     const x1 = sample([1, 2, 3, 4, 5, 6])
 *     const x2 = sample([1, 2, 3, 4, 5, 6])
 *     return { expr: await expr(`(x - ${x1}) (x - ${x2})`).expand().latex() }
 *   }}
 * />
 */
export function Sequence<T extends object>(props: Props<T>) {
  const location = useLocation()
  const prefix = () => `sequence:${location.pathname}:${location.search}:${props.id}:`
  const key = (i: number) => `${prefix()}:${i}`
  const keys = createMemo(() => Object.keys(localStorage).filter((k) => k.startsWith(prefix())))
  const length = createMemo(() => ('children' in props ? props.children.length : keys().length + 1))
  const progress = createMemo(() => {
    return range(length()).map((k) => {
      try {
        const exercise = JSON.parse(localStorage.getItem(key(k)) ?? 'null')
        return exercise.every((part: any) => part.correct)
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
            fetch: (_id, position) => {
              const exercise = JSON.parse(localStorage.getItem(key(i)) ?? '[]')
              return exercise[position] ?? null
            },
            save: (_id, position, step) => {
              const stored = JSON.parse(localStorage.getItem(key(i)) ?? '[]')
              if (position >= stored.length) stored.push(step)
              else stored[position] = step
              localStorage.setItem(key(i), JSON.stringify(stored))
              refresh(keys)
              refresh(progress)
            },
          }}
        >
          {'children' in props ? (
            props.children[i]
          ) : 'exercise' in props ? (
            <Scope>
              {() => {
                const next = createMemo(() => props.next({ position: i, progress: progress() }))
                return <Dynamic component={props.exercise} {...next()} />
              }}
            </Scope>
          ) : (
            <Dynamic component={props.next} position={i} progress={progress()} />
          )}
        </ExerciseContext>
      ))}
    </Pagination>
  )
}
