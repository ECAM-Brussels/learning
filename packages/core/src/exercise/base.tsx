import { FeedbackContext, MathField } from '@learning/components'
import { Dynamic, type JSX } from '@solidjs/web'
import { mapValues } from 'es-toolkit'
import {
  action,
  createContext,
  createMemo,
  createOptimistic,
  createProjection,
  createSignal,
  Errored,
  Loading,
  omit,
  refresh,
  Show,
  useContext,
  type Component,
  type ComponentProps,
} from 'solid-js'
import * as v from 'valibot'
import { expr, Expression } from '../expr'

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}
type MaybeAsync<T> = T | Promise<T>

const CustomSchemas = {
  expr: v.union([
    v.pipe(
      v.string(),
      v.transform((s) => expr(s)),
    ),
    Expression,
  ]),
} as const
type CustomSchemas = typeof CustomSchemas

type ResolveSchema<T> =
  T extends v.BaseSchema<any, any, any>
    ? T
    : T extends keyof CustomSchemas
      ? CustomSchemas[T] extends v.BaseSchema<any, any, any>
        ? CustomSchemas[T]
        : never
      : never

type StepInputs = Record<string, v.BaseSchema<any, any, any> | keyof CustomSchemas>
function Inputs<T extends StepInputs>(rawSchema: T) {
  const transformed = Object.fromEntries(
    Object.entries(rawSchema).map(([key, value]) => [
      key,
      typeof value === 'string' && Object.keys(CustomSchemas).includes(value)
        ? CustomSchemas[value as keyof CustomSchemas]
        : value,
    ]),
  ) as { [K in keyof T]: ResolveSchema<T[K]> }
  return v.object(transformed)
}

type Inputs<
  T extends Record<string, v.BaseSchema<any, any, any> | keyof CustomSchemas>,
  U extends 'input' | 'output' = 'input',
> =
  ReturnType<typeof Inputs<T>> extends v.ObjectSchema<{ [K in keyof T]: ResolveSchema<T[K]> }, any>
    ? U extends 'output'
      ? v.InferOutput<ReturnType<typeof Inputs<T>>>
      : v.InferInput<ReturnType<typeof Inputs<T>>>
    : never

function StoredStep<D extends StepInputs, I extends StepInputs>(data: D, inputs: I) {
  return v.object({
    name: v.optional(v.string()),
    data: Inputs(data),
    state: v.partial(Inputs(inputs)),
    submitted: v.optional(v.boolean(), false),
    correct: v.optional(v.boolean()),
  })
}

type StoredStep<
  D extends StepInputs = Record<string, v.UnknownSchema>,
  I extends StepInputs = Record<string, v.UnknownSchema>,
  U extends 'input' | 'output' = 'input',
> = U extends 'output'
  ? v.InferOutput<ReturnType<typeof StoredStep<D, I>>>
  : v.InferInput<ReturnType<typeof StoredStep<D, I>>>

type ExerciseContext = {
  fetch: (id: string, position: number) => MaybeAsync<StoredStep | null>
  save: (id: string, position: number, step: StoredStep) => MaybeAsync<void>
}

export const ExerciseContext = createContext<ExerciseContext>({
  fetch: (id, position) => {
    const stored = JSON.parse(localStorage.getItem(id) ?? '[]')
    return stored[position] ?? null
  },
  save: (id, position, exercise) => {
    const stored = JSON.parse(localStorage.getItem(id) ?? '[]')
    if (position >= stored.length) stored.push(exercise)
    else stored[position] = exercise
    localStorage.setItem(id, JSON.stringify(stored))
  },
})

type StepContext = {
  exerciseId: string
  position: number
}
const StepContext = createContext<StepContext | null>(null)

type StepSchema = { inputs: StepInputs; data: StepInputs }
type StepProps<S extends StepSchema> = {
  name?: string
  schema: S
  class?: string
  data: Inputs<S['data'], 'input'> | (() => MaybeAsync<Inputs<S['data'], 'input'>>)
  correct: (ctx: {
    data: Inputs<S['data'], 'output'>
    inputs: Inputs<S['inputs'], 'output'>
  }) => MaybeAsync<boolean>
  prompt: (props: {
    data: Inputs<S['data'], 'output'>
    inputs: { [K in keyof S['inputs']]: JSX.Element }
    state: {
      saved?: Inputs<S['inputs'], 'input'>
      current: Partial<Inputs<S['inputs'], 'input'>>
      set: <K extends keyof S['inputs']>(
        key: K,
        value:
          | Inputs<S['inputs'], 'input'>[K]
          | ((
              prev: Inputs<S['inputs'], 'input'>[K] | undefined,
            ) => Inputs<S['inputs'], 'input'>[K]),
      ) => void
      correct?: boolean
    }
  }) => JSX.Element
  children?: (props: {
    data: Inputs<S['data'], 'output'>
    inputs: Inputs<S['inputs'], 'output'>
    correct: boolean
    next: JSX.Element
  }) => JSX.Element
  next?:
    | JSX.Element
    | ((props: {
        data: Inputs<S['data'], 'output'>
        inputs: Inputs<S['inputs'], 'output'>
      }) => JSX.Element)
}

export function Step<S extends StepSchema>(props: StepProps<S> & { id?: string }) {
  const exerciseContext = useContext(ExerciseContext)
  const stepContext = useContext(StepContext)

  const context: StepContext = createProjection(
    () => ({
      exerciseId: props.id ?? stepContext?.exerciseId ?? '',
      position: stepContext?.position ?? 0,
    }),
    { exerciseId: '', position: 0 },
  )
  const nextContext = createMemo(() => ({ ...context, position: context.position + 1 }))

  const [savedStep, setSavedStep] = createOptimistic<StoredStep<S['data'], S['inputs']>>(
    () => exerciseContext.fetch(context.exerciseId, context.position) as any,
  )

  const [step, setStep] = createSignal<StoredStep<S['data'], S['inputs']>>(async () => {
    const data = typeof props.data === 'function' ? await props.data() : props.data
    return {
      name: props.name,
      submitted: false,
      ...savedStep(),
      state: savedStep()?.state ?? {},
      data: { ...data, ...savedStep()?.data },
    }
  })

  const correct = createMemo(() =>
    step().submitted
      ? props.correct({
          data: v.parse(Inputs(props.schema.data as S['data']), step().data),
          inputs: v.parse(Inputs(props.schema.inputs as S['inputs']), step().state),
        })
      : undefined,
  )

  const fields = createMemo(() =>
    mapValues(props.schema.inputs as S['inputs'], (_schema, name) => {
      const component = createMemo(() => {
        if (_schema === 'expr') return MathField
        return 'input'
      })
      return (
        <Dynamic
          class="rounded border border-gray-200"
          component={component()}
          value={step().state[name] ?? ''}
          onChange={(e: Event & { target: HTMLInputElement }) => {
            setStep((prev) => ({
              ...prev,
              state: {
                ...prev.state,
                [name]: e.target.value,
              },
            }))
          }}
          readonly={step().submitted}
        />
      )
    }),
  )

  return (
    <div class={props.class}>
      <FeedbackContext
        value={{
          get correct() {
            return correct()
          },
        }}
      >
        <Errored
          fallback={(err) => (
            <details open>
              <summary>Erreur</summary>
              {String(err())}
            </details>
          )}
        >
          <Loading fallback={<p>Chargement du prompt...</p>}>
            <Dynamic
              component={props.prompt}
              data={step().data}
              inputs={fields()}
              state={
                {
                  get saved() {
                    return savedStep()?.state ?? {}
                  },
                  get current() {
                    return step().state as Partial<Inputs<S['inputs'], 'input'>>
                  },
                  set: (key, value) => {
                    setStep((prev) => ({
                      ...prev,
                      state: {
                        ...prev.state,
                        [key]: value instanceof Function ? value(prev.state[key]) : value,
                      },
                    }))
                  },
                  get correct() {
                    return correct()
                  },
                } satisfies ComponentProps<typeof props.prompt>['state']
              }
            />
          </Loading>
        </Errored>
        <Show
          when={step().submitted}
          fallback={
            <button
              class="rounded-lg bg-green-800 px-3 py-2 text-green-100"
              onClick={action(async function* () {
                const transformed = v.parse(
                  StoredStep(props.schema.data as S['data'], props.schema.inputs as S['inputs']),
                  { ...step(), submitted: true },
                )
                const correct = await props.correct({
                  data: transformed.data,
                  inputs: transformed.state,
                })
                const newStep = { ...transformed, correct, submitted: true }
                setSavedStep(newStep)
                await exerciseContext.save(context.exerciseId, context.position, newStep)
                yield
                refresh(savedStep)
                refresh(step)
              })}
            >
              Soumettre
            </button>
          }
        >
          <StepContext value={nextContext()}>
            <Errored
              fallback={(err) => (
                <details open>
                  <summary>Erreur</summary>
                  {String(err())}
                </details>
              )}
            >
              <Loading fallback="Calcul du feedback">
                <Show
                  when={props.children}
                  fallback={
                    typeof props.next === 'function' ? (
                      <Dynamic
                        component={props.next}
                        data={v.parse(Inputs(props.schema.data as S['data']), step().data)}
                        inputs={v.parse(Inputs(props.schema.inputs as S['inputs']), step().state)}
                      />
                    ) : (
                      props.next
                    )
                  }
                >
                  {/* Go to next */}
                  <Dynamic
                    component={props.children}
                    data={v.parse(Inputs(props.schema.data as S['data']), step().data)}
                    inputs={v.parse(Inputs(props.schema.inputs as S['inputs']), step().state)}
                    correct={step().correct ?? false}
                    next={
                      typeof props.next === 'function' ? (
                        <Dynamic
                          component={props.next}
                          data={v.parse(Inputs(props.schema.data as S['data']), step().data)}
                          inputs={v.parse(Inputs(props.schema.inputs as S['inputs']), step().state)}
                        />
                      ) : (
                        props.next
                      )
                    }
                  />
                </Show>
              </Loading>
            </Errored>
          </StepContext>
        </Show>
      </FeedbackContext>
    </div>
  )
}

export function createStep<S extends StepSchema>(
  step: Omit<StepProps<S>, 'data'>,
): Component<
  { id?: string } & Pick<StepProps<S>, 'next' | 'children'> &
    (Inputs<S['data'], 'input'> | { data: StepProps<S>['data'] })
> {
  return (props) => {
    const data = omit(props, 'id', 'data', 'children') as Inputs<S['data'], 'input'> | undefined
    return <Step {...step} {...props} data={('data' in props ? props.data : data)!} />
  }
}
