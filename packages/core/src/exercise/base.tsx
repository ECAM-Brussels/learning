import { Dynamic } from '@solidjs/web'
import { mapAsync, mapValues, partialRight } from 'es-toolkit'
import stringify from 'safe-stable-stringify'
import {
  action,
  createContext,
  createMemo,
  createStore,
  flush,
  For,
  refresh,
  Show,
  useContext,
  type Component,
  type JSX,
} from 'solid-js'
import * as v from 'valibot'

type MaybeAsync<T> = T | Promise<T>

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type FieldComponent<S extends v.BaseSchema<any, any, any>> = Component<{
  name: string
  label: string
  value?: v.InferOutput<S>
  currentValue?: v.InferOutput<S>
  onChange: (newValue: v.InferOutput<S>) => void
  question?: boolean
  readOnly?: boolean
}>

type Field<S extends v.BaseSchema<any, any, any> = v.BaseSchema<any, any, any>> = S & {
  label?: string
  Component?: FieldComponent<S>
}

/**
 * Create a `Field`, which describe the shape of user input
 *
 * @param field - schemas associated with the fields
 *
 * @remarks This identity helper exists
 * because preserving the exact types associated the input and their transforms is crucial.
 */
export function defineField<F extends Field>(field: F): F {
  return field
}

type RawShape = Record<string, v.BaseSchema<any, any, any>>

/**
 * Transform a record of fields (`shape`) into a Valibot schema,
 *
 * @param shape
 * @param stage
 * @returns Valibot schema
 */
function RawShapeSchema<T extends RawShape>(shape: T) {
  return v.object(mapValues(shape, (field) => field) as { [K in keyof T]: T[K] })
}

/**
 * Infer the type associated with a schema factory
 *
 * @remarks Exercise are schema factories because they depend on the shape of the question and the steps.
 * @typeParam F - The schema factory to infer the type from
 * @typeParam T - Whether to infer the input or output type of the schema factory
 */
type Infer<
  F extends (...args: any[]) => v.BaseSchema<any, any, any> | v.BaseSchemaAsync<any, any, any>,
  T extends 'input' | 'output' = 'output',
> = T extends 'output'
  ? v.InferOutput<ReturnType<F>>
  : T extends 'input'
    ? v.InferInput<ReturnType<F>>
    : never

type InferFromShape<
  T extends Record<string, Field>,
  U extends 'input' | 'output' = 'output',
> = Infer<typeof RawShapeSchema<T>, U>

/**
 * Defines an exercise schema
 *
 * @remarks
 * Step schemas must be defined this early
 * so that feedback function can fully infer the type of the attempt.
 */
export function defineSchema<
  const N extends string,
  Q extends RawShape,
  const S extends Record<string, { previous?: (keyof S)[]; state: RawShape }> & {
    start: { previous?: []; state: RawShape }
  },
>(schema: { name: N; question: Q; steps: S }) {
  return schema
}

type Schema<
  N extends string = any,
  Q extends RawShape = any,
  S extends Record<string, { previous?: (keyof S)[]; state: RawShape }> & {
    start: { previous?: []; state: RawShape }
  } = any,
> = ReturnType<typeof defineSchema<N, Q, S>>

function Part<
  T extends Schema,
  K extends keyof T['steps'],
  S extends 'selected' | 'submitted' | 'graded' = 'selected',
>(schema: T, step: K, stage?: S) {
  const selected = v.object({
    step: v.literal(step as K),
  })
  const submitted = v.object({
    ...selected.entries,
    state: RawShapeSchema(schema.steps[step].state as T['steps'][K]['state']),
    correct: v.optional(v.boolean()),
    score: v.optional(v.tuple([v.number(), v.number()])),
  })
  const graded = v.object({
    ...submitted.entries,
    correct: v.boolean(),
    score: v.tuple([v.number(), v.number()]),
  })
  return (
    stage === 'selected' || stage === undefined ? selected : stage === 'graded' ? graded : submitted
  ) as S extends 'selected'
    ? typeof selected
    : S extends 'graded'
      ? typeof graded
      : typeof submitted
}

type Part<
  T extends Schema,
  K extends keyof T['steps'],
  S extends 'selected' | 'submitted' | 'graded' = 'selected',
> = Infer<typeof Part<T, K, S>>

function PartUnion<
  T extends Schema,
  K extends readonly (keyof T['steps'])[],
  S extends 'selected' | 'submitted' | 'graded' = 'selected',
>(schema: T, steps: K, stage?: S) {
  return v.variant(
    'step',
    steps.map((step) => Part(schema, step, stage)),
  ) as v.VariantSchema<'step', { [I in keyof K]: ReturnType<typeof Part<T, K[I], S>> }, undefined>
}

type PartUnion<
  T extends Schema,
  K extends readonly (keyof T['steps'])[] = readonly (keyof T['steps'])[],
  S extends 'selected' | 'submitted' | 'graded' = 'selected',
> = Infer<typeof PartUnion<T, K, S>>

type Props<
  T extends Schema,
  K extends keyof T['steps'],
  F extends boolean = true,
  U extends 'input' | 'output' = 'output',
> = Prettify<
  {
    question: InferFromShape<T['question'], U>
    state?: InferFromShape<T['steps'][K]['state'], U>
    previous: T['steps'][K] extends { previous: infer P }
      ? P extends Array<any>
        ? {
            [I in keyof P]: P[I] extends keyof T['steps']
              ? InferFromShape<T['steps'][P[I]]['state'], U>
              : never
          }
        : []
      : {
          [S in keyof T['steps']]: InferFromShape<T['steps'][S]['state']>
        }[keyof T['steps']][]
  } & (F extends true ? Partial<{ correct: boolean; score: [number, number] }> : {})
>

export type Feedback<T extends Schema, K extends keyof T['steps']> = (
  props: Required<Props<T, K, false>>,
) => MaybeAsync<{ correct: boolean; score: [number, number]; next: keyof T['steps'] | null }>

/**
 * Describe how to grade a particular exercise and redirect the next step
 *
 * @param data - Record describing how to grade each step
 */
export function defineFeedback<T extends Schema>(data: {
  [K in keyof T['steps']]: Feedback<T, K>
}) {
  return data
}

function Attempt<T extends Schema, S extends 'graded' | 'submitted'>(schema: T, stage: S) {
  const steps = Object.keys(schema.steps) as T['steps'][keyof T['steps']]
  return v.array(v.union([PartUnion(schema, steps, stage), PartUnion(schema, steps, 'selected')]))
}

export function Exercise<T extends Schema, S extends 'graded' | 'submitted'>(schema: T, stage: S) {
  return v.object({
    name: v.literal(schema.name as T['name']),
    question: RawShapeSchema(schema.question as T['question']),
    attempt: Attempt(schema, stage),
  })
}
type Exercise<
  T extends Schema,
  S extends 'graded' | 'submitted' = 'graded',
  U extends 'input' | 'output' = 'output',
> = Infer<typeof Exercise<T, S>, U>
type GradedExercise<T extends Schema> = Omit<Exercise<T>, 'params'>

export const grade = async function <T extends Schema>(
  schema: T,
  feedback: ReturnType<typeof defineFeedback<T>>,
  rawExercise: Exercise<T, 'submitted', 'input'>,
): Promise<GradedExercise<T>> {
  const exercise = v.parse(Exercise(schema, 'submitted'), rawExercise)
  const { question, attempt, ...rest } = exercise
  let modifiedAttempt = await mapAsync(attempt, async (part, i) => {
    if ('state' in part && part.state) {
      const result = await feedback[part.step]({
        question,
        state: part.state,
        previous: attempt
          .slice(0, i)
          .toReversed()
          .map((s: any) => s.state) as any,
      })
      return { ...part, ...result }
    }
    return part
  })
  if (modifiedAttempt.length === 0) modifiedAttempt.push({ step: 'start' })
  const lastPart = modifiedAttempt.at(-1)
  if (lastPart && 'next' in lastPart && lastPart.next) {
    modifiedAttempt.push({ step: lastPart.next })
  }
  return { ...rest, question, attempt: modifiedAttempt }
}

type FieldProps<T extends Schema, K extends keyof T['steps']> = {
  name:
    | `question.${keyof T['question'] & string}`
    | `state.${keyof T['steps'][K]['state'] & string}`
}

type FeedbackComponent<T extends Schema> = Component<{
  children: JSX.Element | (() => JSX.Element)
}>

export type View<T extends Schema, K extends keyof T['steps'] = keyof T['steps']> = (
  props: Props<T, K>,
  utils: {
    Field: Component<FieldProps<T, K>>
    Feedback: FeedbackComponent<T>
  },
) => JSX.Element

type ExerciseContext<T extends Schema> = {
  fetch: (id: string) => MaybeAsync<Exercise<T>> | undefined
  save: (id: string, exercise: GradedExercise<T>) => any
  reset?: (id: string) => void | Promise<void>
}

export const ExerciseContext = createContext<ExerciseContext<any>>({
  fetch: (id) => JSON.parse(localStorage.getItem(id) ?? 'null'),
  save: (id, exercise) => localStorage.setItem(id, stringify(exercise)),
  reset: (id) => localStorage.removeItem(id),
})

type FinalViewProps<T extends Schema> = Prettify<
  Exercise<T, 'graded', 'input'>['question'] & {
    id?: string
    class?: JSX.ClassList | string
  }
>

/**
 * Creates the component associated with the exercise
 *
 * @param schema - Raw schema of the exercise
 * @param feedback - Record describing how to grade a schema
 * @param view - Record describing the UI of each step
 * @returns SolidJS component orchestrating generation, grading, validation, submission and revalidation.
 */
export function createView<T extends Schema>(
  schema: T,
  feedback: ReturnType<typeof defineFeedback<T>>,
  view: { [K in keyof T['steps']]: View<T, K> },
): Component<FinalViewProps<T>> {
  return function Component(props) {
    const context = useContext<ExerciseContext<T>>(ExerciseContext)
    const key = () => props.id ?? ''

    const exercise = createMemo(async () => {
      const { id, class: _class, ...question } = props
      const fetched = await context.fetch(key())
      const parsed = v.parse(Exercise(schema, 'graded'), {
        name: schema.name,
        attempt: [{ step: 'start' }],
        ...fetched,
        question: { ...question, ...fetched?.question },
      })
      return parsed
    })
    const reset = action(function* () {
      yield context.reset?.(key())
      refresh(exercise)
    })
    return (
      <div class={['not-prose my-4 rounded-xl p-4 shadow', props.class]}>
        <For each={exercise().attempt}>
          {<K extends keyof T['steps']>(
            part: () =>
              | Part<T, K, 'graded'>
              | { step: K; state?: never; correct?: never; score?: never },
            i: () => number,
          ) => {
            const [state, setState] = createStore<Record<string, any>>(() => part().state ?? {})
            const validated = createMemo(() =>
              v.safeParse(Part(schema, part().step, 'submitted'), {
                ...part(),
                state,
              }),
            )
            const submit = action(async function* () {
              if (!validated().success) return
              const graded = await grade(schema, feedback, {
                ...exercise(),
                attempt: [
                  ...exercise().attempt.toSpliced(-1),
                  validated().output as Part<T, K, 'submitted'>,
                ],
              })
              await context.save(key(), JSON.parse(JSON.stringify(graded)))
              yield
              refresh(exercise)
            })

            function Field(props: FieldProps<T, K>) {
              const name = () => props.name.split('.')[1]!
              const isQuestion = createMemo(() => props.name.startsWith('question'))
              const field = createMemo((): Field => {
                if (isQuestion()) {
                  return schema.question[name() as keyof T['question']]
                }
                return schema.steps[part().step].state[name() as keyof T['steps'][K]['state']]
              })
              const value = () =>
                isQuestion()
                  ? exercise().question[name() as keyof T['question']]
                  : part().state?.[name()]
              return (
                <Dynamic
                  component={field().Component ?? 'input'}
                  name={name() as string}
                  label={field().label ?? ''}
                  question={isQuestion()}
                  value={value()}
                  currentValue={state[name()] ?? exercise().question[name() as keyof T['question']]}
                  onChange={(newValue: any) => {
                    try {
                      setState((s) => {
                        s[name()] = newValue
                      })
                      flush()
                    } catch {}
                  }}
                  readOnly={!!part().state}
                />
              )
            }

            const Feedback: FeedbackComponent<T> = (props) => {
              return (
                <Show when={!part().correct && part().state}>
                  <details open class="m-4 border-l-4 border-slate-400 px-4 text-slate-600">
                    <summary class="font-bold">Feedback</summary>
                    {typeof props.children === 'function' ? props.children() : props.children}
                  </details>
                </Show>
              )
            }

            return (
              <div>
                <Dynamic
                  component={partialRight(view[part().step], { Field, Feedback })}
                  {...({
                    correct: part().correct,
                    score: part().score,
                    question: exercise().question,
                    state: part().state,
                    previous: exercise()
                      .attempt.slice(0, i())
                      .toReversed()
                      .map((s: any) => s.state) as any,
                  } satisfies Props<T, K>)}
                />
                <Show when={!part().state}>
                  <button
                    class={[
                      'rounded-lg bg-green-800 px-3 py-2 text-green-100',
                      {
                        'cursor-not-allowed opacity-15': !validated().success,
                      },
                    ]}
                    disabled={!validated().success}
                    onClick={submit}
                  >
                    Soumettre
                  </button>
                </Show>
                <Show when={i() < exercise().attempt.length - 1}>
                  <hr class="my-4 border-gray-200" />
                </Show>
              </div>
            )
          }}
        </For>
        <Show when={exercise().attempt?.filter((s) => 'state' in s).length > 0 && context.reset}>
          <button class="ml-auto block cursor-pointer text-xs text-slate-400" onClick={reset}>
            Recommencer l'exercice
          </button>
        </Show>
      </div>
    )
  }
}
