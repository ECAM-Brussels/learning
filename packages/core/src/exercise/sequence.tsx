import { Boundary, Pagination, Scope } from '@learning/components'
import { useLocation } from '@solidjs/router'
import { dynamic, type JSX } from '@solidjs/web'
import { range } from 'es-toolkit'
import { createMemo, onSettled, refresh, useContext, type Component } from 'solid-js'
import * as v from 'valibot'
import { StepContext } from './context'
import local from './context.local'
import {
  fetchSequence as fetchRemoteSequence,
  getProgress as getRemoteProgress,
} from './context.remote'
import { Options, OptionsContext } from './options'

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type Props<T extends object> = Prettify<
  {
    options?: Options<'input'>
  } & (
    | {
        exercise: Component<T>
        next: (props: {
          position: number
          progress: Record<number, boolean | null | undefined>
        }) => Promise<T> | T
      }
    | {
        next: Component<{ position: number; progress: Record<number, boolean | null | undefined> }>
      }
    | {
        children: JSX.Element
      }
  )
>

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
export function Sequence<T extends object>(props: Props<T> & { id: string }) {
  const optionsContext = useContext(OptionsContext)
  const rawOptions = createMemo(() => ({ ...optionsContext(), ...props.options }))
  const options = createMemo(() => v.parse(Options, rawOptions()))
  onSettled(() => {
    const interval = setInterval(() => {
      refresh(options)
    }, 1000)
    return () => clearInterval(interval)
  })

  const sequence = createMemo(() => ({ url: useLocation().pathname, sequenceId: props.id }))
  const progress = createMemo(
    async () => {
      const seq = sequence()
      const remoteProgress = getRemoteProgress(seq)
      const localProgress = local.getProgress(seq)
      return (await remoteProgress) ?? (await localProgress)
    },
    { name: 'progress' },
  )
  const filteredProgress = createMemo(() =>
    Object.fromEntries(
      Object.entries(progress()).filter(([_pos, value]) => typeof value === 'boolean'),
    ),
  )
  const stepContext = (sequencePosition = 0) => ({
    ...sequence(),
    sequencePosition,
    position: 0,
  })
  const length = createMemo(() => Object.keys(filteredProgress()).length + 1)
  const pages: (() => JSX.Element)[] = []
  return (
    <OptionsContext value={rawOptions}>
      <Boundary fallback="Chargement des exercices...">
        {'children' in props ? (
          <StaticPages
            context={stepContext()}
            progress={progress()}
            showFeedback={options().showFeedback}
          >
            {props.children}
          </StaticPages>
        ) : (
          <Pagination progress={progress()} showFeedback={options().showFeedback}>
            {range(length()).map(
              (i) =>
                (pages[i] ??= () => (
                  <StepContext value={() => ({ ...stepContext(i), generated: true })}>
                    <Boundary fallback="Chargement de l'exercice...">
                      {'exercise' in props ? (
                        <Scope>
                          {() => {
                            const next = createMemo(() =>
                              props.next({ position: i, progress: progress() }),
                            )
                            const Exercise = dynamic(() => props.exercise)
                            return <Exercise {...next()} />
                          }}
                        </Scope>
                      ) : (
                        (() => {
                          const Next = dynamic(() => props.next)
                          return <Next position={i} progress={progress()} />
                        })()
                      )}
                    </Boundary>
                  </StepContext>
                )),
            )}
          </Pagination>
        )}
      </Boundary>
    </OptionsContext>
  )
}

function StaticPages(props: {
  children: JSX.Element
  context: StepContext
  progress: Record<number, boolean | null | undefined>
  showFeedback: boolean
}) {
  let next = 0
  const claim = () => next++
  return (
    <StepContext value={() => ({ ...props.context, claim })}>
      {(() => {
        const pages = createMemo(
          () => {
            next = 0
            const children = props.children
            return (Array.isArray(children) ? children : [children]).map((child) => () => child)
          },
          { name: 'sequence-children' },
        )
        return (
          <Pagination progress={props.progress} showFeedback={props.showFeedback}>
            {pages()}
          </Pagination>
        )
      })()}
    </StepContext>
  )
}

export function preloadSequences(url: string, sequenceIds: readonly string[]) {
  for (const sequenceId of sequenceIds) {
    const seq = { url, sequenceId }
    void fetchRemoteSequence(seq)
    void local.fetchSequence(seq)
    void getRemoteProgress(seq)
    void local.getProgress(seq)
  }
}
