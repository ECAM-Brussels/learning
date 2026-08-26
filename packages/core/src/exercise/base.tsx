import { Boundary, FeedbackContext, MathField } from '@learning/components'
import { action, useLocation } from '@solidjs/router'
import { Dynamic, type JSX } from '@solidjs/web'
import { mapValues } from 'es-toolkit'
import {
  createMemo,
  createStore,
  omit,
  Show,
  useContext,
  type Component,
  type ComponentProps,
} from 'solid-js'
import * as v from 'valibot'
import { getUser } from '../auth'
import { expr, Expression } from '../expr'
import { hasPermissions } from '../permissions'
import { StepContext } from './context'
import local from './context.local'
import remote from './context.remote'

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

export type StoredStep<
  D extends RawShape = Record<string, v.UnknownSchema>,
  I extends RawShape = Record<string, v.UnknownSchema>,
  U extends 'input' | 'output' = 'input',
> = U extends 'output'
  ? v.InferOutput<ReturnType<typeof StoredStep<D, I>>>
  : v.InferInput<ReturnType<typeof StoredStep<D, I>>>

type StepSchema = { inputs: RawShape; data: RawShape }

type Infer<T, U extends 'input' | 'output' = 'input'> =
  T extends v.BaseSchema<any, any, any>
    ? U extends 'output'
      ? v.InferOutput<T>
      : v.InferInput<T>
    : T

type StepBaseProps<D, I extends v.ObjectSchema<any, any>, F extends JsonObject> = {
  name?: string
  class?: string
  data: Infer<D, 'input'> | (() => MaybeAsync<Infer<D, 'input'>>)
  grade: (ctx: {
    data: Infer<NoInfer<D>, 'output'>
    inputs: v.InferOutput<NoInfer<I>>
  }) => MaybeAsync<boolean | [boolean, F]>
  prompt: (props: {
    data: Infer<NoInfer<D>, 'output'>
    inputs: { [K in keyof NoInfer<I>['entries']]: JSX.Element }
    state: {
      saved?: v.InferInput<NoInfer<I>>
      current: Partial<v.InferInput<NoInfer<I>>>
      set: <K extends keyof NoInfer<I>['entries']>(
        key: K,
        value:
          | v.InferInput<NoInfer<I>>[K]
          | ((prev: v.InferInput<NoInfer<I>>[K] | undefined) => v.InferInput<NoInfer<I>>[K]),
      ) => void
      correct?: boolean
    }
  }) => JSX.Element
  feedback?: (props: {
    data: Infer<NoInfer<D>, 'output'>
    inputs: v.InferOutput<NoInfer<I>>
    feedback: F
    correct: boolean
    Self: Component<Partial<StepBaseProps<NoInfer<D>, I, F>>>
    next: JSX.Element
  }) => JSX.Element
  children?:
    | JSX.Element
    | ((props: {
        data: Infer<NoInfer<D>, 'output'>
        inputs: v.InferOutput<NoInfer<I>>
      }) => JSX.Element)
}

type StepProps<S extends StepSchema, F extends JsonObject> = StepBaseProps<
  ReturnType<typeof ObjectSchema<NoInfer<S>['data']>>,
  ReturnType<typeof ObjectSchema<NoInfer<S>['inputs']>>,
  F
> & { schema: S }

export function useExerciseContext() {
  return createMemo(async () => {
    const user = await getUser()
    return user ? remote : local
  }, {})
}

function useStepContext<S extends StepSchema>(
  id: () => string | undefined,
  data: () => StepProps<S, any>['data'],
) {
  const inherited = useContext(StepContext)
  const exerciseContext = useExerciseContext()
  const stepContext = createMemo(() => ({
    url: useLocation().pathname,
    sequenceId: id() ?? inherited?.().sequenceId ?? '',
    sequencePosition: inherited?.().sequencePosition ?? 0,
    position: inherited?.().position ?? 0,
  }))

  const exerciseData = createMemo(() => {
    const dataValue = data()
    return typeof dataValue === 'function' ? dataValue() : dataValue
  })
  const fetched = createMemo(() => exerciseContext().fetchStep(stepContext()))
  const step = createMemo<StoredStep<S['data'], S['inputs']>>(async () => {
    const [saved, data] = [fetched(), exerciseData()]
    return {
      state: {},
      ...(saved ?? {}),
      data: { ...data, ...saved?.data },
    } as StoredStep<S['data'], S['inputs']>
  })

  const saveStep = (newStep: StoredStep<S['data'], S['inputs'], 'output'>) =>
    exerciseContext().saveStep(stepContext(), newStep)

  const reset = action(async () => {
    const { position, ...ctx } = stepContext()
    await exerciseContext().reset(ctx)
  })

  const StepBoundary = (props: {
    fallback?: JSX.Element
    children?: JSX.Element
    offset?: number
  }) => (
    <StepContext
      value={() => ({ ...stepContext(), position: stepContext().position + (props.offset ?? 0) })}
    >
      <FeedbackContext
        value={{
          get correct() {
            return step().correct
          },
        }}
      >
        <Boundary fallback={props.fallback}>{props.children}</Boundary>
      </FeedbackContext>
    </StepContext>
  )

  return { ctx: stepContext, StepBoundary, saveStep, step, reset }
}

export function Step<S extends StepSchema, F extends JsonObject>(
  props: StepProps<S, F> & { id?: string },
) {
  const { ctx, StepBoundary, saveStep, step, reset } = useStepContext<S>(
    () => props.id,
    () => props.data,
  )

  const [state, setState] = createStore<Partial<ObjectSchema<S['inputs'], 'input'>>>(
    () => step().state,
    {} as any,
  )

  const schemas = createMemo(() => ({
    data: ObjectSchema(props.schema.data as S['data']),
    inputs: ObjectSchema(props.schema.inputs as S['inputs']),
  }))
  const parsedData = createMemo(() => v.parse(schemas().data, step().data))
  const parsedInputs = createMemo(() => v.parse(schemas().inputs, state))
  const parsed = createMemo(() => ({ data: parsedData(), inputs: parsedInputs() }))

  const fields = createMemo(() =>
    mapValues(props.schema.inputs as S['inputs'], (schema, name) => (
      <Dynamic
        class="rounded border border-gray-200"
        component={schema === 'expr' ? MathField : 'input'}
        value={step().state[name] ?? ''}
        onChange={(e: Event & { target: HTMLInputElement }) => {
          setState((s) => {
            s[name] = e.target.value as any
          })
        }}
        readonly={step().submitted}
      />
    )),
  )

  const promptState = {
    get saved() {
      return step().state
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
      return step().correct
    },
  } satisfies ComponentProps<typeof props.prompt>['state']

  const submit = action(async (newState: typeof state) => {
    const payload = {
      ...step(),
      state: newState,
      submitted: true,
    }
    const parsed = v.parse(v.object(schemas()), { data: payload.data, inputs: payload.state })
    const [correct, feedback] = normalizeGrade(await props.grade(parsed))
    payload.correct = correct
    payload.feedback = feedback
    const parsedPayload = v.parse(
      StoredStep(props.schema.data as S['data'], props.schema.inputs as S['inputs']),
      payload,
    )
    await saveStep(JSON.parse(JSON.stringify(parsedPayload)))
  })

  const Self = (attrs: Partial<StepProps<S, F>>) => (
    <Step {...props} data={step().data} {...attrs} />
  )

  const Next = (attrs: { children: typeof props.children }) => (
    <Show
      when={typeof attrs.children === 'function' && attrs.children}
      fallback={<>{attrs.children}</>}
    >
      {(next) => <Dynamic component={next()} {...parsed()} />}
    </Show>
  )

  const canReset = createMemo(async () => {
    if (ctx().position !== 0) return false
    return await hasPermissions(['exercise:deleteOwn'])
  })
  return (
    <div class={props.class}>
      <StepBoundary fallback="Chargement de l'exercice...">
        <form method="post" action={submit.with(state)}>
          <Dynamic
            component={props.prompt}
            data={parsedData()}
            inputs={fields()}
            state={promptState}
          />
          <Show when={!step().submitted}>
            <button class="block rounded-lg bg-green-800 px-3 py-2 text-green-100">
              Soumettre
            </button>
          </Show>
        </form>
      </StepBoundary>
      <Show when={step().submitted}>
        <StepBoundary fallback="Chargement du feedback..." offset={1}>
          <Dynamic
            component={props.feedback}
            {...parsed()}
            correct={step().correct ?? false}
            feedback={step().feedback as F}
            Self={Self}
            next={<Next>{props.children}</Next>}
          />
          <Show when={step().correct}>
            <Next>{props.children}</Next>
          </Show>
        </StepBoundary>
        <Show when={canReset()}>
          <form method="post" action={reset}>
            <button class="text-sm text-gray-500">Recommencer l'exercice</button>
          </form>
        </Show>
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
