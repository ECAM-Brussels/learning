import { Dynamic } from '@solidjs/web'
import { mapAsync, mapValues, partialRight } from 'es-toolkit'
import stringify from 'safe-stable-stringify'
import {
  createContext,
  createMemo,
  createProjection,
  createStore,
  Errored,
  For,
  Loading,
  omit,
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

/**
 * Shape of user input
 *
 * @remarks Multiple schemas need to be provided,
 * because some transforms are very useful from a DX point of view
 * (e.g. convert LaTeX strings into an object that allow symbolic manipulation)
 * but their output might be serializable.
 *
 * For this very reason,
 * transforms associated with the 'feedback' schema
 * are delayed as long as possible.
 *
 * @typeParam S - type of user input
 * @typeParam T - output type of user input
 * @typeParam U - output type of input, after transforms
 */
type Field<S = any, T = any, U = any> = {
  base: v.GenericSchema<S, T>
  feedback: v.GenericSchema<T, U>
  label: string
  Component: Component<{
    name: string
    label: string
    value?: U
    question?: boolean
    state: Record<string, any>
    setState: ReturnType<typeof createStore<Record<string, any>>>[1]
    readOnly?: boolean
  }>
}

/**
 * Create a `Field`, which describe the shape of user input
 *
 * @param field - schemas associated with the fields
 *
 * @remarks This identity helper exists
 * because preserving the exact types associated the input and their transforms is crucial.
 */
export function defineField<S, T, U>(field: Field<S, T, U>) {
  return field
}

type RawShape = Record<string, Field>

/**
 * Transform a record of fields (`shape`) into a Valibot schema,
 * using either the 'base' or 'feedback' schema of each field depending on the `stage` parameter.
 *
 * @param shape
 * @param stage
 * @returns Valibot schema
 */
function RawShapeSchema<T extends RawShape, S extends 'base' | 'feedback'>(shape: T, stage: S) {
  return v.object(mapValues(shape, (field) => field[stage]) as { [K in keyof T]: T[K][S] })
}

type InferFromShape<T extends Record<string, Field>, S extends 'base' | 'feedback'> = v.InferOutput<
  ReturnType<typeof RawShapeSchema<T, S>>
>

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
  S extends boolean = false,
  V extends 'base' | 'feedback' = 'base',
>(schema: T, step: K, withState?: S, stage?: V) {
  const base = v.object({
    step: v.literal(step as K),
  })
  const extended = v.object({
    ...base.entries,
    state: RawShapeSchema(schema.steps[step].state as T['steps'][K]['state'], stage ?? 'base'),
  })
  return (withState ? extended : base) as S extends true ? typeof extended : typeof base
}

type Part<
  T extends Schema,
  K extends keyof T['steps'],
  S extends boolean = false,
  V extends 'base' | 'feedback' = 'base',
> = Infer<typeof Part<T, K, S, V>>

function PartUnion<
  T extends Schema,
  K extends readonly (keyof T['steps'])[],
  S extends boolean = false,
  V extends 'base' | 'feedback' = 'base',
>(schema: T, steps: K, withState?: S, stage?: V) {
  return v.variant(
    'step',
    steps.map((step) => Part(schema, step, withState, stage)),
  ) as v.VariantSchema<
    'step',
    { [I in keyof K]: ReturnType<typeof Part<T, K[I], S, V>> },
    undefined
  >
}

type PartUnion<
  T extends Schema,
  K extends readonly (keyof T['steps'])[] = readonly (keyof T['steps'])[],
  S extends boolean = false,
  V extends 'base' | 'feedback' = 'base',
> = Infer<typeof PartUnion<T, K, S, V>>

type Props<T extends Schema, K extends keyof T['steps'], F extends boolean = true> = Prettify<
  {
    question: InferFromShape<T['question'], 'feedback'>
    state?: InferFromShape<T['steps'][K]['state'], 'feedback'>
    previous: {
      [S in T['steps'][K]['previous'][number]]: InferFromShape<T['steps'][S]['state'], 'feedback'>
    }[T['steps'][K]['previous'][number]][]
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

function Attempt<T extends Schema, V extends 'base' | 'feedback'>(schema: T, stage: V) {
  const steps = Object.keys(schema.steps) as T['steps'][keyof T['steps']]
  return v.array(
    v.union([PartUnion(schema, steps, true, stage), PartUnion(schema, steps, false, stage)]),
  )
}

export function Exercise<T extends Schema>(schema: T) {
  return v.object({
    name: v.literal(schema.name as T['name']),
    question: RawShapeSchema(schema.question as T['question'], 'base'),
    attempt: Attempt(schema, 'base'),
  })
}
type Exercise<T extends Schema> = Infer<typeof Exercise<T>>
type GradedExercise<T extends Schema> = Omit<Exercise<T>, 'params'>

export const grade = async function <T extends Schema>(
  schema: T,
  feedback: ReturnType<typeof defineFeedback<T>>,
  exercise: Exercise<T>,
): Promise<GradedExercise<T>> {
  const { question, attempt, ...rest } = exercise
  const parsedQuestion = v.parse(
    RawShapeSchema(schema.question as T['question'], 'feedback'),
    question,
  )
  const parsedAttempt = v.parse(Attempt(schema, 'feedback'), attempt)
  let modifiedAttempt = await mapAsync(attempt, async (part, i) => {
    if ('state' in part && 'state' in parsedAttempt[i]! && part.state) {
      const result = await feedback[part.step]({
        question: parsedQuestion,
        state: parsedAttempt[i]!.state ?? part.state,
        previous: parsedAttempt.slice(0, i).toReversed() as any,
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
export type View<T extends Schema, K extends keyof T['steps'] = keyof T['steps']> = (
  props: Props<T, K>,
  Field: Component<FieldProps<T, K>>,
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
  Exercise<T>['question'] & {
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

    const fetched = createMemo(() => context.fetch(key()))
    const data = createProjection(() => ({
      name: schema.name as T['name'],
      question: fetched()?.question ?? (omit(props, 'class') as unknown as Exercise<T>['question']),
      attempt: fetched()?.attempt ?? [],
    }))
    const exercise = createProjection(async () => grade(schema, feedback, fetched() ?? data))
    const parsedQuestion = createMemo(() =>
      v.parse(RawShapeSchema(schema.question as T['question'], 'feedback'), data.question),
    )
    const parsedAttempt = createMemo(() => v.parse(Attempt(schema, 'feedback'), exercise.attempt))
    return (
      <div class={props.class}>
        <Loading fallback="Génération de l'exercice...">
          <For each={parsedAttempt()}>
            {<K extends keyof T['steps']>(
              part: () =>
                | Part<T, K, true>
                | { step: K; state?: never; correct?: never; score?: never },
              i: () => number,
            ) => {
              const [state, setState] = createStore<Partial<Part<T, K>>>(() => part().state ?? {})
              const validated = createMemo(() =>
                v.safeParse(Part(schema, part().step, true), {
                  ...part(),
                  state,
                }),
              )
              const submit = async () => {
                if (!validated().success) return
                const graded = await grade(schema, feedback, {
                  ...exercise,
                  attempt: [
                    ...exercise.attempt.toSpliced(-1),
                    validated().output as Part<T, K, true>,
                  ],
                })
                await context.save(key(), graded)
                refresh(exercise)
              }
              const reset = async () => {
                await context.reset?.(key())
                refresh(exercise)
              }

              function Field(props: FieldProps<T, K>) {
                const name = () => props.name.split('.')[1]!
                const isQuestion = createMemo(() => props.name.startsWith('question'))
                const field = createMemo((): Field => {
                  if (isQuestion()) {
                    return schema.question[name() as keyof T['question']]
                  }
                  return schema.steps[part().step].state[name()]
                })
                const value = () =>
                  isQuestion()
                    ? exercise.question[name() as keyof T['question']]
                    : part().state?.[name()]
                return (
                  <Dynamic
                    component={field().Component}
                    name={name()}
                    label={field().label}
                    question={isQuestion()}
                    value={value()}
                    state={state}
                    setState={setState}
                    readOnly={!!part().state}
                  />
                )
              }
              return (
                <Errored fallback={(error) => <pre>{JSON.stringify(error, null, 2)}</pre>}>
                  <Dynamic
                    component={partialRight(view[part().step], Field)}
                    {...({
                      question: parsedQuestion(),
                      state: part().state,
                      previous: parsedAttempt().slice(0, i()).toReversed() as any,
                    } as Props<T, K>)}
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
                  <Show when={part().state && context.reset}>
                    <button class="rounded-lg bg-gray-100 px-3 py-2 text-gray-400" onClick={reset}>
                      Reset
                    </button>
                  </Show>
                </Errored>
              )
            }}
          </For>
        </Loading>
      </div>
    )
  }
}
