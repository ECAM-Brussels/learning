import { Dynamic } from '@solidjs/web'
import { allKeyed, mapValues } from 'es-toolkit'
import stringify from 'safe-stable-stringify'
import {
  action,
  createContext,
  createMemo,
  createProjection,
  createSignal,
  Loading,
  refresh,
  Show,
  useContext,
  type Component,
  type JSX,
} from 'solid-js'
import * as v from 'valibot'
import { expr, Expression } from '../expr'

type MaybeAsync<T> = T | Promise<T>
type AwaitAll<T extends Record<string, unknown>> = {
  [K in keyof T]: Awaited<T[K]>
} & {}

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

function StoredStep<I extends StepInputs>(inputs: I) {
  return v.object({
    name: v.optional(v.string()),
    state: v.partial(Inputs(inputs)),
    submitted: v.optional(v.boolean(), false),
    correct: v.optional(v.boolean()),
  })
}

type StoredStep<
  I extends StepInputs = Record<string, v.UnknownSchema>,
  U extends 'input' | 'output' = 'input',
> = U extends 'output'
  ? v.InferOutput<ReturnType<typeof StoredStep<I>>>
  : v.InferInput<ReturnType<typeof StoredStep<I>>>

type ExerciseContext = {
  fetch: (id: string) => MaybeAsync<StoredStep[]>
  save: (id: string, exercise: StoredStep[]) => MaybeAsync<void>
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

type StepProps<
  I extends StepInputs,
  F extends Record<string, unknown> & { correct: MaybeAsync<boolean> },
> = {
  name?: string
  inputs: I
  feedback: (inputValues: Inputs<I, 'output'>) => MaybeAsync<F>
  prompt: (props: {
    inputs: { [K in keyof I]: JSX.Element }
    savedState?: Inputs<I, 'input'>
    state: Partial<Inputs<I, 'input'>>
    setState: <K extends keyof I>(
      key: K,
      value:
        | Inputs<I, 'input'>[K]
        | ((prev: Inputs<I, 'input'>[K] | undefined) => Inputs<I, 'input'>[K]),
    ) => void
    feedback?: AwaitAll<F>
  }) => JSX.Element
  children?: ((props: AwaitAll<F>) => JSX.Element) | JSX.Element
}

export function createStepComponent<P extends StepInputs>(
  schema: P,
  Component: Component<Inputs<P, 'output'>>,
) {
  return (rawProps: Inputs<P, 'input'> & { id?: string }) => {
    const props = createProjection(() => v.parse(Inputs(schema), rawProps))
    return <Component {...props} id={rawProps.id} />
  }
}

export function Step<
  I extends StepInputs,
  F extends Record<string, unknown> & { correct: MaybeAsync<boolean> },
>(props: StepProps<I, F> & { id?: string }) {
  const exerciseContext = useContext(ExerciseContext)
  const stepContext = useContext(StepContext)
  const steps = createMemo<readonly StoredStep[]>(async () =>
    stepContext ? stepContext.steps() : ((await exerciseContext.fetch(props.id ?? '')) ?? []),
  )
  const context = createProjection((): StepContext => {
    if (stepContext) return stepContext
    return {
      steps,
      saveStep: action(function* (position: number, step: StoredStep) {
        step = { ...step, submitted: true }
        const snapshot = [...steps()]
        if (position >= snapshot.length) snapshot.push(step)
        else snapshot[position] = step
        yield exerciseContext.save(props.id ?? '', snapshot)
        refresh(steps)
      }),
      position: 0,
    }
  })

  const [step, setStep] = createSignal<StoredStep<I>>(
    () =>
      ({
        name: props.name,
        state: context.steps()[context.position]?.state ?? {},
        submitted: false,
        ...context.steps()[context.position],
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
      <Loading fallback={<p>Chargement du prompt...</p>}>
        <Dynamic
          component={props.prompt}
          {...({
            inputs: fields(),
            savedState: context.steps()[context.position]?.state as Inputs<I, 'input'> | undefined,
            state: step().state as Partial<Inputs<I, 'input'>>,
            setState: (key, value) => {
              setStep((prev) => ({
                ...prev,
                state: {
                  ...prev.state,
                  [key]: value instanceof Function ? value(prev.state[key]) : value,
                },
              }))
            },
            get feedback() {
              return feedbackResult()
            },
          } satisfies Parameters<StepProps<I, F>['prompt']>[0])}
        />
      </Loading>
      <Show when={!step().submitted}>
        <button
          class="rounded-lg bg-green-800 px-3 py-2 text-green-100"
          onClick={async () => {
            const parsed = v.parse(StoredStep(props.inputs), step())
            const correct = (await allKeyed(await props.feedback(parsed.state))).correct
            context.saveStep(context?.position ?? 0, {
              ...step(),
              correct,
            })
          }}
        >
          Soumettre
        </button>
      </Show>
      <Loading fallback={<p>Calcul du feedback...</p>}>
        <Show when={step().submitted && feedbackResult()}>
          {(feedback) => (
            <StepContext value={{ ...context, position: context.position + 1 }}>
              {typeof props.children === 'function' ? props.children(feedback()) : props.children}
            </StepContext>
          )}
        </Show>
        <Show when={steps().length > 0 && stepContext === null}>
          <button
            class="ml-auto block cursor-pointer text-xs text-slate-400"
            onClick={() => {
              localStorage.clear()
              refresh(steps)
            }}
          >
            Recommencer
          </button>
        </Show>
      </Loading>
    </>
  )
}
