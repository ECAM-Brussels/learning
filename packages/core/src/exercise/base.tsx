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
          data: v.parse(ObjectSchema(props.schema.data as S['data']), step().data),
          inputs: v.parse(ObjectSchema(props.schema.inputs as S['inputs']), step().state),
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

  const parsedData = createMemo(() =>
    v.parse(ObjectSchema(props.schema.data as S['data']), step().data),
  )

  const Self = (attrs: Partial<StepProps<S>>) => <Step {...props} data={step().data} {...attrs} />

  const Next = (attrs: { children: typeof props.children }) => (
    <Show
      when={typeof attrs.children === 'function' && attrs.children}
      fallback={<>{attrs.children}</>}
    >
      {(next) => (
        <Dynamic
          component={next()}
          data={parsedData()}
          inputs={v.parse(ObjectSchema(props.schema.inputs as S['inputs']), step().state)}
        />
      )}
    </Show>
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
              data={parsedData()}
              inputs={fields()}
              state={
                {
                  get saved() {
                    return savedStep()?.state ?? {}
                  },
                  get current() {
                    return step().state as Partial<ObjectSchema<S['inputs'], 'input'>>
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
                  data: v.parse(ObjectSchema(props.schema.data as S['data']), step().data),
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
          <StepContext
            value={{
              get exerciseId() {
                return context.exerciseId
              },
              get position() {
                return context.position + 1
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
              <Loading fallback="Calcul du feedback">
                <Show when={props.feedback} fallback={<Next>{props.children}</Next>}>
                  <Dynamic
                    component={props.feedback}
                    data={parsedData()}
                    inputs={v.parse(ObjectSchema(props.schema.inputs as S['inputs']), step().state)}
                    correct={step().correct ?? false}
                    Self={Self}
                    next={<Next>{props.children}</Next>}
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
  { id?: string } & Pick<StepProps<S>, 'class' | 'feedback' | 'children'> &
    (ObjectSchema<S['data'], 'input'> | { data: StepProps<S>['data'] })
> {
  return (props) => {
    const data = omit(props, 'id', 'class', 'feedback', 'data', 'children') as
      | ObjectSchema<S['data'], 'input'>
      | undefined
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
