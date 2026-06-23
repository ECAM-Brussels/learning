import { FeedbackContext, MathField } from '@learning/components'
import { Dynamic, type JSX } from '@solidjs/web'
import { mapValues } from 'es-toolkit'
import stringify from 'safe-stable-stringify'
import {
  action,
  createContext,
  createMemo,
  createSignal,
  Loading,
  merge,
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
  ReturnType<typeof Inputs<T>> extends v.ObjectSchema<any, any>
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

type StoredExercise = {
  steps: StoredStep[]
}

type ExerciseContext = {
  fetch: (id: string) => MaybeAsync<StoredExercise | null>
  save: (id: string, exercise: StoredExercise) => MaybeAsync<void>
  reset?: (id: string) => MaybeAsync<void>
}

export const ExerciseContext = createContext<ExerciseContext>({
  fetch: (id) => JSON.parse(localStorage.getItem(id) ?? 'null'),
  save: (id, exercise) => localStorage.setItem(id, stringify(exercise)),
  reset: (id) => localStorage.removeItem(id),
})

type StepContext = {
  steps: () => readonly StoredStep[]
  position: number
  saveStep: (position: number, step: StoredStep) => MaybeAsync<void>
}
const StepContext = createContext<StepContext | null>(null)

type StepSchema = { inputs: StepInputs; data: StepInputs }
type StepProps<S extends StepSchema> = {
  name?: string
  schema: S
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
  children?:
    | ((props: {
        data: Inputs<S['data'], 'output'>
        inputs: Inputs<S['inputs'], 'output'>
      }) => JSX.Element)
    | JSX.Element
  next?:
    | ((props: {
        data: Inputs<S['data'], 'output'>
        inputs: Inputs<S['inputs'], 'output'>
      }) => JSX.Element)
    | JSX.Element
}

export function Step<S extends StepSchema>(props: StepProps<S> & { id?: string }) {
  const exerciseContext = useContext(ExerciseContext)
  const stepContext = useContext(StepContext)

  const steps = createMemo<readonly StoredStep[]>(async () =>
    stepContext
      ? stepContext.steps()
      : ((await exerciseContext.fetch(props.id ?? ''))?.steps ?? []),
  )
  const context = createMemo((): StepContext => {
    if (stepContext) return stepContext
    return {
      steps,
      saveStep: action(async function* (position: number, step: StoredStep) {
        const snapshot = [...steps()]
        if (position >= snapshot.length) snapshot.push(step)
        else snapshot[position] = step
        await exerciseContext.save(props.id ?? '', {
          ...((await exerciseContext.fetch(props.id ?? '')) ?? {}),
          steps: snapshot,
        })
        yield
        refresh(steps)
      }),
      position: 0,
    }
  })

  const inputs = createMemo(() => v.parse(Inputs(props.schema.inputs as S['inputs']), step().state))

  const [step, setStep] = createSignal<StoredStep<S['data'], S['inputs']>>(
    async () =>
      ({
        name: props.name,
        data: v.parse(
          Inputs(props.schema.data as S['data']),
          typeof props.data === 'function' ? await props.data() : props.data,
        ),
        state: context().steps()[context().position]?.state ?? {},
        submitted: false,
        ...context().steps()[context().position],
      }) as any,
  )
  const correct = createMemo(async () => {
    if (!step().submitted) return undefined
    return props.correct({
      data: step().data,
      inputs: v.parse(Inputs(props.schema.inputs as S['inputs']), step().state),
    })
  })
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
    <>
      <Loading fallback={<p>Chargement du prompt...</p>}>
        <FeedbackContext
          value={{
            get correct() {
              return correct()
            },
          }}
        >
          <Dynamic
            component={props.prompt}
            data={step().data}
            inputs={fields()}
            state={
              {
                saved: context().steps()[context().position]?.state,
                current: step().state as Partial<Inputs<S['inputs'], 'input'>>,
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
              } as ComponentProps<typeof props.prompt>['state']
            }
          />
        </FeedbackContext>
      </Loading>
      <Show when={!step().submitted}>
        <button
          class="rounded-lg bg-green-800 px-3 py-2 text-green-100"
          onClick={async () => {
            const inputs = v.parse(Inputs(props.schema.inputs as S['inputs']), step().state)
            const correct = await props.correct({ data: step().data, inputs })
            await context().saveStep(context().position ?? 0, {
              ...step(),
              correct,
              submitted: true,
            })
            refresh(steps)
            refresh(step)
          }}
        >
          Soumettre
        </button>
      </Show>
      <Show when={step().submitted}>
        <Loading fallback={<p>Calcul du feedback...</p>}>
          <StepContext value={{ ...context(), position: context().position + 1 }}>
            <Show
              when={!correct()}
              fallback={
                typeof props.next === 'function' ? (
                  <Dynamic component={props.next} data={step().data} inputs={inputs()} />
                ) : (
                  props.next
                )
              }
            >
              <FeedbackContext value={{ correct: false }}>
                {typeof props.children === 'function'
                  ? props.children({ data: step().data, inputs: inputs() })
                  : props.children}
              </FeedbackContext>
            </Show>
          </StepContext>
        </Loading>
      </Show>
    </>
  )
}

export function createStep<S extends StepSchema, P extends keyof StepProps<S>>(
  step: { schema: S } & { [K in P]: StepProps<S>[K] },
): Component<Prettify<Omit<StepProps<S>, P> & Partial<Pick<StepProps<S>, P>> & { id?: string }>> {
  return (props) => {
    const merged = merge(step, props) as unknown as StepProps<S> & { id?: string }
    return <Step {...merged} />
  }
}
