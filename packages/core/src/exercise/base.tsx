import { Boundary, FeedbackContext, MathField } from '@learning/components'
import { Dynamic, type JSX } from '@solidjs/web'
import { mapValues } from 'es-toolkit'
import {
  action,
  createContext,
  createMemo,
  createOptimistic,
  createStore,
  omit,
  refresh,
  Show,
  snapshot,
  useContext,
  type Component,
  type ComponentProps,
} from 'solid-js'
import * as v from 'valibot'
import { expr, Expression } from '../expr'

type MaybeAsync<T> = T | Promise<T>

const CustomSchemas = {
  expr: v.union([
    v.pipe(
      v.string(),
      v.transform((latex) => expr(latex)),
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

type RawShape = Record<string, v.BaseSchema<any, any, any> | keyof CustomSchemas>
function ObjectSchema<T extends RawShape>(rawSchema: T) {
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

type ObjectSchema<
  T extends Record<string, v.BaseSchema<any, any, any> | keyof CustomSchemas>,
  U extends 'input' | 'output' = 'input',
> =
  ReturnType<typeof ObjectSchema<T>> extends v.ObjectSchema<
    { [K in keyof T]: ResolveSchema<T[K]> },
    any
  >
    ? U extends 'output'
      ? v.InferOutput<ReturnType<typeof ObjectSchema<T>>>
      : v.InferInput<ReturnType<typeof ObjectSchema<T>>>
    : never

function StoredStep<D extends RawShape, I extends RawShape>(data: D, inputs: I) {
  return v.object({
    name: v.optional(v.string()),
    data: ObjectSchema(data),
    state: v.partial(ObjectSchema(inputs)),
    submitted: v.optional(v.boolean(), false),
    correct: v.optional(v.boolean()),
  })
}

type StoredStep<
  D extends RawShape = Record<string, v.UnknownSchema>,
  I extends RawShape = Record<string, v.UnknownSchema>,
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
  save: (id, position, step) => {
    const stored = JSON.parse(localStorage.getItem(id) ?? '[]')
    if (position >= stored.length) stored.push(step)
    else stored[position] = step
    localStorage.setItem(id, JSON.stringify(stored))
  },
})

type StepContext = {
  exerciseId: string
  position: number
}
const StepContext = createContext<StepContext | null>(null)

type StepSchema = { inputs: RawShape; data: RawShape }
type StepProps<S extends StepSchema> = {
  name?: string
  schema: S
  class?: string
  data:
    | ObjectSchema<NoInfer<S>['data'], 'input'>
    | (() => MaybeAsync<ObjectSchema<NoInfer<S>['data'], 'input'>>)
  correct: (ctx: {
    data: ObjectSchema<NoInfer<S>['data'], 'output'>
    inputs: ObjectSchema<NoInfer<S>['inputs'], 'output'>
  }) => MaybeAsync<boolean>
  prompt: (props: {
    data: ObjectSchema<NoInfer<S>['data'], 'output'>
    inputs: { [K in keyof S['inputs']]: JSX.Element }
    state: {
      saved?: ObjectSchema<NoInfer<S>['inputs'], 'input'>
      current: Partial<ObjectSchema<NoInfer<S>['inputs'], 'input'>>
      set: <K extends keyof S['inputs']>(
        key: K,
        value:
          | ObjectSchema<NoInfer<S>['inputs'], 'input'>[K]
          | ((
              prev: ObjectSchema<NoInfer<S>['inputs'], 'input'>[K] | undefined,
            ) => ObjectSchema<NoInfer<S>['inputs'], 'input'>[K]),
      ) => void
      correct?: boolean
    }
  }) => JSX.Element
  feedback?: (props: {
    data: ObjectSchema<NoInfer<S>['data'], 'output'>
    inputs: ObjectSchema<NoInfer<S>['inputs'], 'output'>
    correct: boolean
    Self: Component<Partial<StepProps<S>>>
    next: JSX.Element
  }) => JSX.Element
  children?:
    | JSX.Element
    | ((props: {
        data: ObjectSchema<S['data'], 'output'>
        inputs: ObjectSchema<S['inputs'], 'output'>
      }) => JSX.Element)
}

function useStepContext<S extends StepSchema>(id: () => string | undefined) {
  const exerciseContext = useContext(ExerciseContext)
  const stepContext = useContext(StepContext)

  const context: StepContext = {
    get exerciseId() {
      return id() ?? stepContext?.exerciseId ?? ''
    },
    get position() {
      return stepContext?.position ?? 0
    },
  }

  const [savedStep, setSavedStep] = createOptimistic<StoredStep<S['data'], S['inputs']>>(
    () => exerciseContext.fetch(context.exerciseId, context.position) as any,
  )

  const saveStep = (newStep: StoredStep<S['data'], S['inputs']>) =>
    exerciseContext.save(context.exerciseId, context.position, newStep)

  const StepBoundary = (props: {
    correct: () => boolean | undefined
    fallback?: JSX.Element
    children?: JSX.Element
    offset?: number
  }) => (
    <StepContext
      value={{
        get exerciseId() {
          return context.exerciseId
        },
        get position() {
          return context.position + (props.offset ?? 0)
        },
      }}
    >
      <FeedbackContext
        value={{
          get correct() {
            return props.correct()
          },
        }}
      >
        <Boundary fallback={props.fallback}>{props.children}</Boundary>
      </FeedbackContext>
    </StepContext>
  )

  return { StepBoundary, saveStep, savedStep, setSavedStep }
}

export function Step<S extends StepSchema>(props: StepProps<S> & { id?: string }) {
  const { StepBoundary, saveStep, savedStep, setSavedStep } = useStepContext<S>(() => props.id)
  const [step, setStep] = createStore(
    async () => {
      const saved = savedStep()
      const data = typeof props.data === 'function' ? await props.data() : props.data
      return {
        name: props.name,
        submitted: false,
        ...saved,
        state: saved?.state ?? {},
        data: { ...data, ...saved?.data },
      } as StoredStep<S['data'], S['inputs']>
    },
    { submitted: false, state: savedStep()?.state ?? {}, data: { ...savedStep()?.data } },
  )

  const schemas = createMemo(() => ({
    data: ObjectSchema(props.schema.data as S['data']),
    inputs: ObjectSchema(props.schema.inputs as S['inputs']),
  }))
  const parsedData = createMemo(() => v.parse(schemas().data, step.data))
  const parsedInputs = createMemo(() => v.parse(schemas().inputs, step.state))
  const parsed = createMemo(() => ({ data: parsedData(), inputs: parsedInputs() }))
  const correct = createMemo(() => (step.submitted ? props.correct(parsed()) : undefined))

  const fields = createMemo(() =>
    mapValues(props.schema.inputs as S['inputs'], (schema, name) => (
      <Dynamic
        class="rounded border border-gray-200"
        component={schema === 'expr' ? MathField : 'input'}
        value={step.state[name] ?? ''}
        onChange={(e: Event & { target: HTMLInputElement }) => {
          setStep((s) => {
            s.state[name] = e.target.value as any
          })
        }}
        readonly={step.submitted}
      />
    )),
  )

  const promptState = {
    get saved() {
      return savedStep()?.state ?? {}
    },
    get current() {
      return step.state
    },
    set: (key, value) => {
      setStep((s) => {
        s.state[key] = value instanceof Function ? value(s.state[key]) : value
      })
    },
    get correct() {
      return correct()
    },
  } satisfies ComponentProps<typeof props.prompt>['state']

  const submit = action(async function* () {
    const correct = await props.correct(parsed())
    setStep((s) => {
      s.correct = correct
      s.submitted = true
    })
    const newStep = snapshot(step)
    setSavedStep(newStep)
    await saveStep(newStep)
    yield
    refresh(savedStep)
    refresh(step)
  })

  const Self = (attrs: Partial<StepProps<S>>) => <Step {...props} data={step.data} {...attrs} />

  const Next = (attrs: { children: typeof props.children }) => (
    <Show
      when={typeof attrs.children === 'function' && attrs.children}
      fallback={<>{attrs.children}</>}
    >
      {(next) => <Dynamic component={next()} {...parsed()} />}
    </Show>
  )

  return (
    <div class={props.class}>
      <StepBoundary correct={correct} fallback="Chargement de l'exercice...">
        <Dynamic
          component={props.prompt}
          data={parsedData()}
          inputs={fields()}
          state={promptState}
        />
      </StepBoundary>
      <Show
        when={step.submitted}
        fallback={
          <button class="block rounded-lg bg-green-800 px-3 py-2 text-green-100" onClick={submit}>
            Soumettre
          </button>
        }
      >
        <StepBoundary correct={correct} fallback="Chargement du feedback..." offset={1}>
          <Dynamic
            component={props.feedback}
            {...parsed()}
            correct={step.correct ?? false}
            Self={Self}
            next={<Next>{props.children}</Next>}
          />
          <Show when={step.correct}>
            <Next>{props.children}</Next>
          </Show>
        </StepBoundary>
      </Show>
    </div>
  )
}

export function createStep<S extends StepSchema>(
  step: Omit<StepProps<S>, 'data'>,
): Component<
  { id?: string } & Pick<StepProps<S>, 'class' | 'feedback' | 'children'> &
    (ObjectSchema<S['data'], 'input'> | { data: StepProps<S>['data'] })
> {
  return (props) => {
    const data = omit(props, 'id', 'class', 'feedback', 'data', 'children') as
      ObjectSchema<S['data'], 'input'> | undefined
    return (
      <Step
        {...step}
        id={props.id}
        class={props.class ?? step.class}
        feedback={props.feedback ?? step.feedback}
        children={props.children ?? step.children}
        data={('data' in props ? props.data : data)!}
      />
    )
  }
}
