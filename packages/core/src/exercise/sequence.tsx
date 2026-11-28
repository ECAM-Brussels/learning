import { Boundary, Pagination, Scope } from '@learning/components'
import { useLocation } from '@solidjs/router'
import { dynamic, type JSX } from '@solidjs/web'
import { range } from 'es-toolkit'
import { createMemo, onSettled, refresh, Show, useContext, type Component } from 'solid-js'
import * as v from 'valibot'
import { hasPermissions } from '../permissions'
import { StepContext } from './context'
import local from './context.local'
import {
  fetchSequence as fetchRemoteSequence,
  getProgress as getRemoteProgress,
  getStats as getRemoteStats,
} from './context.remote'
import { Options, OptionsContext } from './options'
import { SequenceStats } from './stats'

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type NextProps = {
  position: number
  progress: Record<number, boolean | null | undefined>
  /**
   * The data saved for this position, if it was already generated.
   * Use it to choose which exercise to restore, since the saved data only reaches the step once it is rendered.
   */
  saved: unknown
}

type Props<T extends object> = Prettify<
  {
    options?: Options<'input'>
  } & (
    | {
        exercise: Component<T>
        next: (props: NextProps) => Promise<T> | T
      }
    | {
        next: Component<NextProps>
      }
    | {
        children: JSX.Element
      }
  )
>

/**
 * A series of exercises, shown one page at a time, with a bar of each exercise's progress.
 * `id` names the series on its page, to save its answers:
 * its exercises need no `id` of their own.
 * Teachers see the progress of every student in it.
 *
 * There are two ways to give its exercises:
 *
 * 1. as children, written in advance;
 * 2. with `next`, a component that makes each exercise in turn,
 *    from the position, the progress and the saved data of the series;
 *    or a function giving only the exercise's data, the exercise being `exercise`.
 *
 * `options` apply to every exercise of the series.
 *
 * @example
 * <Sequence id="predefined">
 *   <Factor expr="x^2 - 5x + 6" />
 *   <Factor expr="x^2 - 3x + 2" />
 *   <Factor expr="x^2 - x - 6" />
 * </Sequence>
 *
 * @example
 * <Sequence
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
  const savedSteps = createMemo(
    async () => {
      const seq = sequence()
      const remoteSequence = fetchRemoteSequence(seq)
      const localSequence = local.fetchSequence(seq)
      return (await remoteSequence) ?? (await localSequence)
    },
    { name: 'saved-steps' },
  )
  const saved = (position: number) => savedSteps()[position]?.[0]?.data
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
  const canSeeStats = createMemo(() => hasPermissions(['exercise:read']), { name: 'canSeeStats' })
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
                              props.next({ position: i, progress: progress(), saved: saved(i) }),
                            )
                            const Exercise = dynamic(() => props.exercise)
                            return <Exercise {...next()} />
                          }}
                        </Scope>
                      ) : (
                        (() => {
                          const Next = dynamic(() => props.next)
                          return <Next position={i} progress={progress()} saved={saved(i)} />
                        })()
                      )}
                    </Boundary>
                  </StepContext>
                )),
            )}
          </Pagination>
        )}
      </Boundary>
      <Boundary>
        <Show when={canSeeStats()}>
          <div class="mx-8">
            <SequenceStats fetch={() => getRemoteStats(sequence())} />
          </div>
        </Show>
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
