import { allKeyed, mapValues } from 'es-toolkit'
import stringify from 'safe-stable-stringify'
import {
  action,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  createStore,
  deep,
  Loading,
  onSettled,
  refresh,
  Show,
  useContext,
  type JSX,
} from 'solid-js'
import * as v from 'valibot'
import { expr } from '../expr'

// Typescript helpers
type MaybeAsync<T> = T | Promise<T>
type AwaitAll<T extends Record<string, unknown>> = {
  [K in keyof T]: Awaited<T[K]>
} & {}

// Custom schemas
const CustomSchemas = {
  expr: v.pipe(
    v.string(),
    v.transform((s) => expr(s)),
  ),
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

function StoredStep<I extends StepInputs>(inputs: I) {
  return v.object({
    name: v.optional(v.string()),
    state: v.partial(Inputs(inputs)),
    submitted: v.boolean(),
  })
}

type StoredStep<
  I extends StepInputs = Record<string, v.UnknownSchema>,
  U extends 'input' | 'output' = 'input',
> = U extends 'output'
  ? v.InferOutput<ReturnType<typeof StoredStep<I>>>
  : v.InferInput<ReturnType<typeof StoredStep<I>>>

const StepContext = createContext<{
  steps: readonly StoredStep[]
  position: number
  saveStep: (position: number, step: StoredStep) => MaybeAsync<void>
}>()

type StepProps<
  I extends StepInputs,
  F extends Record<string, unknown> & { correct: MaybeAsync<boolean> },
> = {
  name?: string
  inputs: I
  feedback: (inputValues: Inputs<I, 'output'>) => MaybeAsync<F>
  prompt: (inputFields: { [K in keyof I]: JSX.Element }, feedback?: AwaitAll<F>) => JSX.Element
  children?: ((props: AwaitAll<F>) => JSX.Element) | JSX.Element
}

export function Exercise<
  I extends StepInputs,
  F extends Record<string, unknown> & { correct: MaybeAsync<boolean> },
>(props: { id: string } & StepProps<I, F>) {
  const [steps, setSteps] = createStore<StoredStep[]>([])
  onSettled(() => {
    const saved = localStorage.getItem(`exercise-${props.id}`)
    if (saved) setSteps((_) => JSON.parse(saved))
  })
  createEffect(
    () => deep(steps),
    (steps) => {
      if (steps.length > 0) localStorage.setItem(`exercise-${props.id}`, stringify(steps))
    },
  )
  return (
    <StepContext
      value={{
        steps,
        position: 0,
        saveStep: (position, step) => {
          const submitted = { ...step, submitted: true }
          setSteps((s) => {
            if (position >= s.length) s.push(submitted)
            else s[position] = submitted
          })
        },
      }}
    >
      <Step {...props} />
    </StepContext>
  )
}

export function Step<
  I extends StepInputs,
  F extends Record<string, unknown> & { correct: MaybeAsync<boolean> },
>(props: StepProps<I, F>) {
  const context = useContext(StepContext)
  const [step, setStep] = createSignal<StoredStep<I>>(
    () =>
      ({
        name: props.name,
        state: context?.steps[context.position]?.state ?? {},
        submitted: false,
        ...context?.steps[context.position],
      }) as any,
  )
  const feedbackResult = createMemo(async () => {
    if (!step().submitted) return undefined
    const parsed = v.parse(StoredStep(props.inputs), step())
    return await allKeyed(await props.feedback(parsed.state))
  })
  const fields = createMemo(() =>
    mapValues(props.inputs, (_schema, name) => (
      <input
        value={step().state[name] ?? ''}
        onChange={(e) => {
          setStep((prev) => ({
            ...prev,
            state: {
              ...prev.state,
              [name]: e.currentTarget.value as any,
            },
          }))
        }}
      />
    )),
  )
  return (
    <>
      <Loading>{props.prompt(fields(), undefined)}</Loading>
      <Show when={!step().submitted}>
        <button
          onClick={action(function* () {
            yield context?.saveStep(context?.position ?? 0, step())
            refresh(step)
          })}
        >
          Soumettre
        </button>
      </Show>
      <Show when={step().submitted && feedbackResult()}>
        {(feedback) => (
          <StepContext
            value={{
              ...context!,
              position: (context?.position ?? 0) + 1,
            }}
          >
            {typeof props.children === 'function' ? props.children(feedback()) : props.children}
          </StepContext>
        )}
      </Show>
    </>
  )
}
