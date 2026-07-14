import { Boundary, FeedbackContext, MathField } from '@learning/components'
import { Dynamic, type JSX } from '@solidjs/web'
import { mapValues } from 'es-toolkit'
import {
  action,
  createContext,
  createMemo,
  createOptimisticStore,
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
type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

const Json: v.GenericSchema<Json> = v.lazy(() =>
  v.union([
    v.string(),
    v.number(),
    v.boolean(),
    v.null(),
    v.record(v.string(), Json),
    v.array(Json),
  ]),
)

const JsonObject = v.record(v.string(), Json)
type JsonObject = v.InferInput<typeof JsonObject>

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
    feedback: v.optional(v.object({}), {}),
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
type StepProps<S extends StepSchema, F extends JsonObject> = {
  name?: string
  schema: S
  class?: string
  data:
    | ObjectSchema<NoInfer<S>['data'], 'input'>
    | (() => MaybeAsync<ObjectSchema<NoInfer<S>['data'], 'input'>>)
  grade: (ctx: {
    data: ObjectSchema<NoInfer<S>['data'], 'output'>
    inputs: ObjectSchema<NoInfer<S>['inputs'], 'output'>
  }) => MaybeAsync<boolean | [boolean, F]>
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
    feedback: F
    correct: boolean
    Self: Component<Partial<StepProps<S, F>>>
    next: JSX.Element
  }) => JSX.Element
  children?:
    | JSX.Element
    | ((props: {
        data: ObjectSchema<S['data'], 'output'>
        inputs: ObjectSchema<S['inputs'], 'output'>
      }) => JSX.Element)
}

function useStepContext<S extends StepSchema>(
  id: () => string | undefined,
  data: () => StepProps<S, any>['data'],
) {
  const exerciseContext = useContext(ExerciseContext)
  const stepContext = useContext(StepContext)

  const exerciseId = createMemo(() => id() ?? stepContext?.exerciseId ?? '')
  const position = createMemo(() => stepContext?.position ?? 0)

  const [step, setStep] = createOptimisticStore<StoredStep<S['data'], S['inputs']>>(
    async () => {
      const saved = await exerciseContext.fetch(exerciseId(), position())
      const dataValue = data()
      return {
        submitted: false,
        state: {},
        ...saved,
        data: {
          ...(typeof dataValue === 'function' ? await dataValue() : dataValue),
          ...saved?.data,
        },
      } as StoredStep<S['data'], S['inputs']>
    },
    { submitted: false, state: {}, data: {} } as any,
  )

  const saveStep = (newStep: StoredStep<S['data'], S['inputs'], 'output'>) =>
    exerciseContext.save(exerciseId(), position(), newStep)

  const StepBoundary = (props: {
    fallback?: JSX.Element
    children?: JSX.Element
    offset?: number
  }) => (
    <StepContext value={{ exerciseId: exerciseId(), position: position() + (props.offset ?? 0) }}>
      <FeedbackContext
        value={{
          get correct() {
            return step.correct
          },
        }}
      >
        <Boundary fallback={props.fallback}>{props.children}</Boundary>
      </FeedbackContext>
    </StepContext>
  )

  return { StepBoundary, saveStep, step, setStep }
}

export function Step<S extends StepSchema, F extends JsonObject>(
  props: StepProps<S, F> & { id?: string },
) {
  const { StepBoundary, saveStep, step, setStep } = useStepContext<S>(
    () => props.id,
    () => props.data,
  )

  const [state, setState] = createStore<Partial<ObjectSchema<S['inputs'], 'input'>>>(
    () => step.state,
    {} as any,
  )

  const schemas = createMemo(() => ({
    data: ObjectSchema(props.schema.data as S['data']),
    inputs: ObjectSchema(props.schema.inputs as S['inputs']),
  }))
  const parsedData = createMemo(() => v.parse(schemas().data, step.data))
  const parsedInputs = createMemo(() => v.parse(schemas().inputs, state))
  const parsed = createMemo(() => ({ data: parsedData(), inputs: parsedInputs() }))

  const fields = createMemo(() =>
    mapValues(props.schema.inputs as S['inputs'], (schema, name) => (
      <Dynamic
        class="rounded border border-gray-200"
        component={schema === 'expr' ? MathField : 'input'}
        value={step.state[name] ?? ''}
        onChange={(e: Event & { target: HTMLInputElement }) => {
          setState((s) => {
            s[name] = e.target.value as any
          })
        }}
        readonly={step.submitted}
      />
    )),
  )

  const promptState = {
    get saved() {
      return step.state
    },
    get current() {
      return state
    },
    set: (key, value) => {
      setState((s) => {
        s[key] = value instanceof Function ? value(s[key]) : value
      })
    },
    get correct() {
      return step.correct
    },
  } satisfies ComponentProps<typeof props.prompt>['state']

  const submit = action(async function* () {
    setStep((s) => {
      s.state = state as ObjectSchema<S['inputs'], 'input'>
      s.submitted = true
    })
    const [correct, feedback] = normalizeGrade(await props.grade(parsed()))
    setStep((s) => {
      s.correct = correct
      s.feedback = feedback
    })
    await saveStep(
      // Parsing is important here to ensure the schemas decide how to be serialized
      v.parse(
        StoredStep(props.schema.data as S['data'], props.schema.inputs as S['inputs']),
        snapshot(step),
      ),
    )
    yield
    refresh(step)
  })

  const Self = (attrs: Partial<StepProps<S, F>>) => <Step {...props} data={step.data} {...attrs} />

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
      <StepBoundary fallback="Chargement de l'exercice...">
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
        <StepBoundary fallback="Chargement du feedback..." offset={1}>
          <Dynamic
            component={props.feedback}
            {...parsed()}
            correct={step.correct ?? false}
            feedback={step.feedback as F}
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

export function createStep<S extends StepSchema, F extends JsonObject>(
  step: Omit<StepProps<S, F>, 'data'>,
): Component<
  { id?: string } & Pick<StepProps<S, F>, 'class' | 'feedback' | 'children'> &
    (ObjectSchema<S['data'], 'input'> | { data: StepProps<S, F>['data'] })
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

function normalizeGrade<T extends boolean | [boolean, JsonObject]>(
  result: T,
): T extends boolean ? [boolean, {}] : T {
  if (typeof result === 'boolean') {
    return [result, {}] as any
  }
  return result as any
}
