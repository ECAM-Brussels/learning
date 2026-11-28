import { Boundary, FeedbackContext, Form, MathField, Youtube } from '@learning/components'
import { revalidate, useLocation } from '@solidjs/router'
import { dynamic, type JSX } from '@solidjs/web'
import { allKeyed, mapValues, throttle } from 'es-toolkit'
import {
  action,
  affects,
  createEffect,
  createMemo,
  createOptimistic,
  createOptimisticStore,
  createSignal,
  createStore,
  Match,
  omit,
  onSettled,
  refresh,
  Show,
  Switch,
  untrack,
  useContext,
  type Component,
  type ComponentProps,
} from 'solid-js'
import * as v from 'valibot'
import { getUser } from '../auth'
import { expr, Expression } from '../expr'
import { hasPermissions } from '../permissions'
import { omitFromJSON } from '../validation'
import { createIsVisible } from '../visibility'
import { StepContext } from './context'
import local from './context.local'
import remote, { fetchSequence as fetchRemoteSequence } from './context.remote'
import { ExerciseOptions, Options, OptionsContext } from './options'
import { ExerciseStats } from './stats'

type MaybeAsync<T> = T | Promise<T>

const CustomSchemas = {
  /**
   * `true` or `false`.
   */
  boolean: v.boolean(),
  /**
   * A mathematical expression, given as LaTeX:
   * in `grade` and `feedback`, it is an expression of `expr`, with `isEqual`, `diff`…
   */
  expr: v.union([
    v.pipe(
      v.string(),
      v.check((latex) => {
        try {
          expr(latex)
          return true
        } catch {
          return false
        }
      }),
      v.transform((latex) => expr(latex)),
    ),
    Expression,
  ]),
  /**
   * Text or JSX, such as a statement: JSX is not saved with the answers, text is.
   */
  jsx: v.union([v.string(), omitFromJSON(v.custom<JSX.Element>(() => true))]),
  /**
   * Text, such as the code a student writes.
   */
  string: v.string(),
  /**
   * A JavaScript number.
   */
  number: v.number(),
} as const
type CustomSchemas = typeof CustomSchemas

/**
 * The schemas a step's `schema` can name with a word: `'expr'`, `'number'`, `'string'`, `'boolean'` and `'jsx'`.
 * They can be combined with valibot's, as in `v.optional(schemas.jsx)`.
 *
 * @example
 * schema: {
 *   data: { expr: 'expr', prompt: v.optional(schemas.jsx) },
 *   inputs: { attempt: 'expr' },
 * }
 */
export const schemas = CustomSchemas

type ResolveSchema<T> =
  T extends v.BaseSchema<any, any, any>
    ? T
    : T extends keyof CustomSchemas
      ? CustomSchemas[T] extends v.BaseSchema<any, any, any>
        ? CustomSchemas[T]
        : never
      : never

type RawShape = Record<string, v.BaseSchema<any, any, any> | keyof CustomSchemas>
type ObjectLikeSchema = v.GenericSchema<Record<string, any>, Record<string, any>>

/**
 * Anything that describes an object:
 *
 * - a raw shape, e.g. `{ a: 'number', b: v.string() }`, wrapped in `v.object` for you
 * - a full valibot schema producing an object, e.g. `v.union([...])` or `v.variant('type', [...])`
 * - an array of raw shapes, shorthand for `v.union([v.object(...), v.object(...)])`
 */
type Shape = RawShape | ObjectLikeSchema | readonly [RawShape, ...RawShape[]]

type RawObjectSchema<T extends RawShape> = v.ObjectSchema<
  { [K in keyof T]: ResolveSchema<T[K]> },
  undefined
>

type ResolveShape<T> = T extends ObjectLikeSchema
  ? T
  : T extends readonly RawShape[]
    ? v.UnionSchema<
        { [K in keyof T]: T[K] extends RawShape ? RawObjectSchema<T[K]> : never },
        undefined
      >
    : T extends RawShape
      ? RawObjectSchema<T>
      : never

export type InferShape<T, U extends 'input' | 'output' = 'input'> = U extends 'output'
  ? v.InferOutput<ResolveShape<T>>
  : v.InferInput<ResolveShape<T>>

/**
 * The schema of a shape, typed as a plain `GenericSchema` so that TypeScript
 * still knows it is a schema while `T` is generic (e.g. inside `Step`).
 */
type ShapeSchema<T> = v.GenericSchema<InferShape<T, 'input'>, InferShape<T, 'output'>>

/**
 * Same type as `T`, but written as a mapped type so that TypeScript can still use it as a
 * contextual type while `T` is generic (otherwise e.g. callbacks inside `.map()` lose their types).
 * Being a homomorphic mapped type over a type parameter, it distributes over unions.
 */
type Contextual<T> = { [K in keyof T]: T[K] }

function isSchema(value: unknown): value is v.GenericSchema {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'schema' &&
    typeof (value as { '~run'?: unknown })['~run'] === 'function'
  )
}

function RawObjectSchema<T extends RawShape>(rawSchema: T) {
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

function ShapeSchema<T extends Shape>(shape: T): ShapeSchema<T> {
  if (isSchema(shape)) return shape as unknown as ShapeSchema<T>
  if (Array.isArray(shape)) return v.union(shape.map(RawObjectSchema)) as unknown as ShapeSchema<T>
  return RawObjectSchema(shape as RawShape) as unknown as ShapeSchema<T>
}

function StoredStep<D extends Shape, I extends RawShape>(data: D, inputs: I) {
  return v.object({
    name: v.nullish(v.string(), undefined),
    data: ShapeSchema(data),
    state: v.partial(RawObjectSchema(inputs)),
    submitted: v.optional(v.boolean(), false),
    correct: v.pipe(
      v.nullish(v.boolean()),
      v.transform((value) => (value === null ? undefined : value)),
    ),
  })
}

export type StoredStep<
  D extends Shape = Record<string, v.UnknownSchema>,
  I extends RawShape = Record<string, v.UnknownSchema>,
  U extends 'input' | 'output' = 'input',
> = U extends 'output'
  ? v.InferOutput<ReturnType<typeof StoredStep<D, I>>>
  : v.InferInput<ReturnType<typeof StoredStep<D, I>>>

export type StepSchema = { inputs: RawShape; data: Shape }

type Infer<T, U extends 'input' | 'output' = 'input'> =
  T extends v.BaseSchema<any, any, any>
    ? U extends 'output'
      ? v.InferOutput<T>
      : v.InferInput<T>
    : T

type StepBaseProps<D, I extends v.ObjectSchema<any, any>> = {
  /**
   * A name that identifies the step in saved answers, namespaced like `'math/algebra/factor'`.
   * It is saved with every answer: never change it once students have answered.
   */
  name?: string
  /**
   * Classes added to the exercise's frame.
   */
  class?: string
  /**
   * The exercise's data, as the schema's `data` describes it.
   * A function draws new data, possibly random:
   * it is called once, and the data saved with the first answer is used afterwards.
   */
  data: Infer<D, 'input'> | (() => MaybeAsync<Infer<D, 'input'>>)
  /**
   * Whether an answer is right, from the data and what the student entered.
   * It returns a boolean, a promise of one, or a list of them, which must all be true.
   *
   * @example
   * grade: (ctx) => ctx.inputs.attempt.isEqual(ctx.data.expr.diff())
   * grade: (ctx) => [ctx.inputs.attempt.isEqual(ctx.data.expr), ctx.inputs.attempt.isFactored()]
   */
  grade: (ctx: {
    data: Infer<NoInfer<D>, 'output'>
    inputs: v.InferOutput<NoInfer<I>>
  }) => MaybeAsync<boolean> | MaybeAsync<boolean>[]
  /**
   * What the student sees: the statement and the fields to answer in.
   * `props.data` is the data, and `props.inputs` holds a field for each input, to place in the JSX.
   * `props.state` reads and sets what has been entered, for custom fields.
   *
   * @example
   * prompt: (ctx) => (
   *   <>
   *     <p>Calculez la dérivée de {tex`${ctx.data.f}`}.</p>
   *     <Attempt>{tex`f'(x) =`} {ctx.inputs.attempt}</Attempt>
   *   </>
   * )
   */
  prompt: (props: {
    data: Infer<NoInfer<D>, 'output'>
    inputs: { [K in keyof NoInfer<I>['entries']]: JSX.Element }
    /**
     * What the student entered: the saved answer, the current draft, and a function to change it.
     */
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
  /**
   * What the fields hold before the student types, from the data:
   * for instance code to complete, as `PythonCode`'s `initialCode` does.
   */
  initialState?: (data: Infer<NoInfer<D>, 'output'>) => Partial<v.InferInput<NoInfer<I>>>
  /**
   * What is shown after an answer:
   * `props.correct` tells whether it was right.
   * It can contain anything, other steps included, which makes the exercise a conversation:
   * after a wrong answer, ask simpler questions, then the same one again with `props.Self`.
   * By default, a check mark tells whether the answer was right.
   *
   * @example
   * feedback: (ctx) => (
   *   <Show when={!ctx.correct}>
   *     <p>Commencez par factoriser le numérateur.</p>
   *     <Factor expr={ctx.data.numerator}>
   *       <ctx.Self />
   *     </Factor>
   *   </Show>
   * )
   */
  feedback?: (props: {
    data: Infer<NoInfer<D>, 'output'>
    inputs: v.InferOutput<NoInfer<I>>
    correct: boolean
    /**
     * The same question again, with the same data: place it at the end of a remediation.
     */
    Self: Component<Partial<StepBaseProps<NoInfer<D>, I>>>
    /**
     * What follows the step once answered correctly, its `children`, to show it elsewhere, such as after a wrong answer.
     */
    next: JSX.Element
  }) => JSX.Element
  /**
   * What follows the step, shown only once it is answered correctly:
   * for instance the next step of a conversation.
   * A function receives the data and the student's answer, to pass them on.
   *
   * @example
   * <Root expr={ctx.data.expr}>
   *   {(rootCtx) => <FactorFromRoot root={rootCtx.inputs.root} />}
   * </Root>
   */
  children?:
    | JSX.Element
    | ((props: {
        data: Infer<NoInfer<D>, 'output'>
        inputs: v.InferOutput<NoInfer<I>>
      }) => JSX.Element)
  /**
   * Called with the saved steps of the exercise whenever they change.
   */
  onChange?: (exercise: Record<number, StoredStep | null | undefined>) => void
  /**
   * Options of the exercise, such as `allowResubmissions` or `readOnly`, or a function of the data giving them.
   * Those of `ExerciseOptions` around it apply too.
   *
   * @example
   * options={{ allowResubmissions: true, showFeedback: new Date('2026-12-15') }}
   */
  options?: Options<'input'> | ((data: Infer<D, 'output'>) => MaybeAsync<Options<'input'>>)
}

type StepProps<S extends StepSchema> = StepBaseProps<
  ShapeSchema<NoInfer<S>['data']>,
  RawObjectSchema<NoInfer<S>['inputs']>
> & { schema: S }

export function useExerciseContext() {
  return createMemo(async () => {
    const user = await getUser()
    return user ? remote : local
  }, {})
}

/**
 * An exercise written in place, without a step made by `createStep`.
 * Prefer `createStep`: a step is reusable, can be placed in other steps' feedback, and its data is typed.
 * `id` names the exercise on its page, to save its answers.
 */
export function Step<S extends StepSchema>(props: StepProps<S> & { id?: string }) {
  /**
   * Retrieve data from the source of truth (localStorage or database),
   * merge it with the props, and validate.
   *
   * We need to be careful here,
   * as some props are static and not serializable,
   * therefore the source of truth should be layered on top of the supplied props.
   */
  const exerciseData = createMemo(() =>
    typeof props.data === 'function' ? props.data() : props.data,
  )

  /**
   * Context information. Aims to answer the following questions:
   *
   * - How to fetch or save?
   * - Is this an exercise (starting step) or a subsequent step?
   */
  const inherited = useContext(StepContext)
  const slot = untrack(() => inherited?.().claim?.())
  const exerciseContext = useExerciseContext()
  const sequenceContext = createMemo(() => ({
    url: useLocation().pathname,
    sequenceId: props.id ?? inherited?.().sequenceId ?? '',
  }))
  const stepContext = createMemo(() => ({
    ...sequenceContext(),
    sequencePosition: slot ?? inherited?.().sequencePosition ?? 0,
    position: inherited?.().position ?? 0,
    generated: props.id === undefined && (inherited?.().generated ?? false),
  }))
  const optionsCtx = useContext(OptionsContext)
  const rawOptions = createMemo(async () => {
    const inherited = optionsCtx()
    const data = exerciseData()
    const opts = props.options
    if (typeof opts !== 'function') return { ...inherited, ...opts }
    return { ...inherited, ...(await opts(data)) }
  })
  const options = createMemo(() => v.parse(Options, rawOptions()))
  onSettled(() => {
    const interval = setInterval(() => {
      refresh(options)
    }, 1000)
    return () => clearInterval(interval)
  })

  const schema = () =>
    StoredStep(props.schema.data as S['data'], props.schema.inputs as S['inputs'])
  const all = createMemo(
    async () => {
      const seq = sequenceContext()
      const remoteSequence = fetchRemoteSequence(seq)
      const localSequence = local.fetchSequence(seq)
      return (await remoteSequence) ?? (await localSequence)
    },
    { name: 'all' },
  )
  const fetched = createMemo(
    () => all()[stepContext().sequencePosition]?.[stepContext().position] ?? null,
  )
  const isGenerated = () =>
    typeof props.data === 'function' ||
    (stepContext().generated === true && stepContext().position === 0)
  const [step, setStep] = createOptimisticStore(() => {
    return v.parse(schema(), {
      state: {},
      ...(fetched() ?? {}),
      data: {
        ...exerciseData(),
        // Static data comes from the source code, which may have been edited since it was saved
        ...(isGenerated() ? fetched()?.data : {}),
      },
    })
  }, {} as any)

  createEffect(
    () => [all(), stepContext().sequencePosition, props.onChange] as const,
    ([all, sequencePosition, onChange]) => {
      onChange?.(all[sequencePosition] ?? {})
    },
  )

  /**
   * Draft state, edited by the user prior to submission.
   *
   * This should use primitive values only (e.g. latex instead of `expr` objects),
   * as this will be consumed by input components
   */
  const [state, setState] = createStore<Partial<InferShape<S['inputs'], 'input'>>>(
    () => ({
      ...props.initialState?.(step.data),
      ...JSON.parse(JSON.stringify(step.state)),
    }),
    {} as any,
  )
  const isValid = createMemo(() => v.safeParse(schema().entries.state, state).success)

  const canSubmit = createMemo(
    () =>
      !options().readOnly && (!step.submitted || (!step.correct && options().allowResubmissions)),
  )
  const [status, setStatus] = createOptimistic<'ready' | 'grading' | 'submitting'>('ready')
  /**
   * Handle submissions
   *
   * - Merge the draft state with the saved state
   * - Grade the exercise
   * - Remove unserializable props
   * - Save and refresh state
   */
  const submit = throttle(
    action(async function* (newState: Partial<InferShape<S['inputs'], 'input'>>) {
      if (!canSubmit()) return
      const state = v.parse(schema().entries.state, newState)
      const submitted = Object.keys(state).length > 0
      let correct: boolean | undefined = undefined
      if (submitted) {
        setStatus('grading')
        affects(step, 'submitted')
        const result = props.grade({ data: step.data, inputs: state })
        correct = Array.isArray(result) ? (await Promise.all(result)).every(Boolean) : await result
        setStatus('submitting')
      }
      const payload = { ...step, state, submitted, correct }
      yield exerciseContext().saveStep(
        stepContext(),
        JSON.parse(JSON.stringify(payload)),
        options(),
      )
      revalidate([
        exerciseContext().fetchSequence.keyFor(sequenceContext()),
        exerciseContext().getProgress.keyFor(sequenceContext()),
      ])
    }),
    1000,
  )

  /**
   * Save on load
   */
  const [form, setForm] = createSignal<HTMLFormElement | null>(null)
  const visible = createIsVisible(form)
  createEffect(
    () => [visible(), step.submitted, fetched()] as const,
    ([isVisible, submitted, fetched]) => {
      if (isVisible && fetched === null && !submitted) {
        // The submission reads the step and its options as they are now, once.
        untrack(() => submit({}))
      }
    },
  )

  const canReset = createMemo(async () => {
    if (canSubmit()) return false
    if (options().readOnly) return false
    if (stepContext().position !== 0) return false
    if (!step.submitted) return false
    return options().allowResets && (await hasPermissions(['exercise:deleteOwn']))
  })
  const watchStats = createMemo(async () => {
    const watch = exerciseContext().watchStats
    if (!watch || stepContext().position !== 0) return null
    if (!(await hasPermissions(['exercise:read']))) return null
    return watch
  })
  const [resetting, setResetting] = createOptimistic(false)
  /**
   * Handle resetting the whole exercise
   */
  const reset = action(async function* () {
    if (!canReset()) return
    setResetting(true)
    setStep((s) => {
      s.submitted = false
      s.correct = undefined
    })
    const { position, ...ctx } = stepContext()
    yield exerciseContext().reset(ctx, options())
    revalidate([
      exerciseContext().fetchSequence.keyFor(sequenceContext()),
      exerciseContext().getProgress.keyFor(sequenceContext()),
    ])
  })

  const StepBoundary = (props: {
    fallback?: JSX.Element
    children?: JSX.Element
    offset?: number
  }) => (
    <StepContext
      value={() => ({ ...stepContext(), position: stepContext().position + (props.offset ?? 0) })}
    >
      <OptionsContext
        value={() => ({
          ...rawOptions(),
          // Some options need to be overriden or can't be inherited
          depth: options().depth + (props.offset ?? 0),
          video: null,
          ...(options().allowResubmissions && step.correct === false
            ? { allowResubmissions: false, readOnly: true }
            : {}),
        })}
      >
        <FeedbackContext
          value={{
            get correct() {
              return options().showFeedback ? step.correct : undefined
            },
          }}
        >
          <Boundary fallback={props.fallback}>{props.children}</Boundary>
        </FeedbackContext>
      </OptionsContext>
    </StepContext>
  )

  const fields = createMemo(() =>
    mapValues(props.schema.inputs as S['inputs'], (schema, name) => {
      const Field = dynamic(() => (schema === 'expr' ? MathField : 'input'))
      return (
        <Boundary>
          <Field
            class="rounded border border-gray-200"
            value={step.state[name] ?? ''}
            onInput={(e: { currentTarget: { value: string } }) => {
              setState((s) => {
                s[name] = e.currentTarget.value as any
              })
            }}
            readonly={!canSubmit()}
          />
        </Boundary>
      )
    }),
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

  const Self = (attrs: Partial<StepProps<S>>) => (
    <ExerciseOptions depth={options().depth}>
      <Step {...props} data={step.data} {...attrs} />
    </ExerciseOptions>
  )

  const Next = (attrs: { children: typeof props.children }) => (
    <Show
      when={typeof attrs.children === 'function' && attrs.children}
      fallback={<>{attrs.children}</>}
    >
      {(next) => {
        const NextComponent = dynamic(() => next())
        return <NextComponent data={step.data} inputs={step.state} />
      }}
    </Show>
  )

  const Prompt = dynamic(() => props.prompt)
  const Feedback = dynamic(() => props.feedback)

  return (
    <div class={['not-prose my-4', props.class]}>
      <StepBoundary fallback="Chargement de l'exercice...">
        <Form
          class={[
            'my-4 rounded-xl bg-gray-50 p-4 shadow hover:bg-sky-50',
            {
              flex: options().video !== undefined,
              'ml-6': options().depth === 1,
              'ml-12': options().depth === 2,
              'ml-18': options().depth === 3,
            },
          ]}
          readOnly={!canSubmit()}
          ref={setForm}
          onSubmit={(e) => {
            e.preventDefault()
            submit(state)
          }}
        >
          <div class="grow">
            <Prompt data={step.data} inputs={fields()} state={promptState} />
            <Show when={canSubmit() && !resetting() && isValid()}>
              <div class="flex items-center gap-4">
                <button
                  class="my-4 block cursor-pointer rounded-lg bg-green-800 px-3 py-2 font-bold text-green-100 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                  disabled={status() !== 'ready'}
                >
                  <Switch fallback="Soumettre">
                    <Match when={status() === 'grading'}>Correction en cours...</Match>
                    <Match when={status() === 'submitting'}>Soumission en cours...</Match>
                  </Switch>
                </button>
              </div>
            </Show>
          </div>
          <Show when={options().video}>{(src) => <Youtube src={src()} zoom={0.8} />}</Show>
        </Form>
      </StepBoundary>
      <Show when={step.submitted && options().showFeedback}>
        <StepBoundary fallback="Chargement du feedback..." offset={1}>
          <Feedback
            data={step.data}
            inputs={step.state}
            correct={step.correct ?? false}
            Self={Self}
            next={<Next>{props.children}</Next>}
          />
          <ExerciseOptions depth={options().depth}>
            <Show when={step.correct}>
              <Next>{props.children}</Next>
            </Show>
          </ExerciseOptions>
        </StepBoundary>
      </Show>
      <div class="flex flex-wrap">
        <Show when={canReset()}>
          <button
            class="cursor-pointer rounded-xl px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
            onClick={reset}
          >
            Recommencer l'exercice
          </button>
        </Show>
        <Show when={watchStats()}>
          {(watch) => (
            <ExerciseStats
              watch={() => {
                const { position, ...ctx } = stepContext()
                return watch()(ctx)
              }}
            />
          )}
        </Show>
      </div>
    </div>
  )
}

/**
 * Creates a step: a question, its correction, and what follows each answer.
 * Steps are the building blocks of exercises:
 * placed in a page as a tag, its data given as attributes, and placed in other steps' `feedback` to guide a student.
 * Answers are saved with the step's data, its `name` and what the student entered.
 *
 * - `schema.data` declares the data of the question, such as the polynomial to factor;
 * - `schema.inputs` declares what the student enters, such as `{ attempt: 'expr' }`;
 * - `prompt` shows the question, `grade` corrects it, and `feedback` says what follows each answer.
 *
 * The step becomes a component, whose attributes are its data, plus:
 * `id` to save the answers (required for an exercise of its own, not inside a `Sequence`),
 * `options`, `feedback` to replace the step's for one page, `children` for what follows a right answer, and `class`.
 * Declare steps at module level, never inside a component.
 *
 * @example
 * export const Derivative = createStep({
 *   name: 'math/calculus/derivative',
 *   schema: { data: { f: 'expr' }, inputs: { attempt: 'expr' } },
 *   prompt: (ctx) => (
 *     <>
 *       <p>Calculez la dérivée de {tex`f(x) = ${ctx.data.f}`}.</p>
 *       <Attempt>{tex`f'(x) =`} {ctx.inputs.attempt}</Attempt>
 *     </>
 *   ),
 *   grade: (ctx) => ctx.inputs.attempt.isEqual(ctx.data.f.diff()),
 * })
 *
 * // In a page:
 * <Derivative id="derivee-1" f="x^3 - 2x" />
 */
export function createStep<S extends StepSchema>(step: Omit<StepProps<S>, 'data'>) {
  const StepComponent: Component<
    {
      /**
       * Names the exercise on its page, to save its answers: required for an exercise of its own,
       * not for one in a `Sequence` or in another step's feedback.
       * Saved with the answers: never change it once students have answered.
       */
      id?: string
    } & Pick<StepProps<S>, 'class' | 'feedback' | 'children' | 'options' | 'onChange'> &
      (InferShape<S['data'], 'input'> | { data: StepProps<S>['data'] })
  > = (props) => {
    const data = omit(
      props,
      'id',
      'class',
      'feedback',
      'data',
      'children',
      'options',
      'onChange',
    ) as InferShape<S['data'], 'input'> | undefined
    return (
      <Step
        {...step}
        id={props.id}
        class={props.class ?? step.class}
        feedback={props.feedback ?? step.feedback}
        children={props.children ?? step.children}
        data={('data' in props ? props.data : data)!}
        options={async (data) => {
          async function getOptions(opt: typeof props.options) {
            if (!opt) return {}
            return typeof opt === 'function' ? await opt(data) : opt
          }
          const { inherited, options } = await allKeyed({
            inherited: getOptions(step.options),
            options: getOptions(props.options),
          })
          return { ...inherited, ...options }
        }}
        onChange={props.onChange ?? step.onChange}
      />
    )
  }
  return Object.assign(StepComponent, { config: step })
}

/**
 * A step made by `createStep`, to be used as a tag or in another step's feedback.
 */
export type StepComponent<S extends StepSchema> = ReturnType<typeof createStep<S>>

/**
 * Creates a step from an existing one, with data of its own:
 * `transform` builds the existing step's data from the new data,
 * and its prompt, correction and remediation are reused as they are.
 * Use it to adapt an exercise to another context,
 * such as asking for the value of a function at a point with the `Simple` step.
 * `transform` must be pure: what is saved, the new data, must give the same question again.
 *
 * - `component`: the existing step;
 * - `schema`: the new data;
 * - `transform`: from the new data to the existing step's;
 * - `patch`: props of the existing step to replace, such as `feedback`.
 *
 * @example
 * export const Evaluation = createDerivedStep(Simple, { f: 'expr', a: 'expr' }, (data) => ({
 *   prompt: <p>Calculez {tex`f(${data.a})`} pour {tex`f(x) = ${data.f}`}.</p>,
 *   label: tex`f(${data.a}) =`,
 *   grade: (attempt) => data.f.subs({ x: data.a }).isEqual(attempt),
 * }))
 *
 * // In a page:
 * <Evaluation id="valeur" f="x^2 + 1" a="3" />
 */
export function createDerivedStep<R extends Shape, S extends StepSchema>(
  component: StepComponent<S>,
  schema: R,
  transform: (
    data: InferShape<NoInfer<R>, 'output'>,
  ) => Contextual<InferShape<NoInfer<S>['data'], 'input'>>,
  patch: Partial<StepProps<{ data: R; inputs: S['inputs'] }>> = {},
) {
  const step = component.config
  function fullTransform(data: InferShape<NoInfer<R>, 'output'>) {
    const transformed = transform(data)
    return v.parse(ShapeSchema(step.schema.data as S['data']), transformed)
  }
  return createStep<{ data: R; inputs: S['inputs'] }>({
    ...step,
    schema: { data: schema, inputs: step.schema.inputs },
    prompt: (props) => {
      const Prompt = dynamic(() => step.prompt)
      const data = createMemo(() => fullTransform(props.data))
      return <Prompt {...props} data={data()} />
    },
    grade: (ctx) => step.grade({ ...ctx, data: fullTransform(ctx.data) }),
    feedback: (props) => {
      const Self: ComponentProps<NonNullable<typeof step.feedback>>['Self'] = (attrs) => {
        const Component = dynamic(() => props.Self)
        return (
          <Component
            {...attrs}
            data={props.data}
            feedback={
              attrs.feedback
                ? (feedbackProps) =>
                    attrs.feedback?.({
                      ...feedbackProps,
                      data: fullTransform(feedbackProps.data),
                      Self,
                    })
                : undefined
            }
          />
        )
      }
      const Feedback = dynamic(() => step.feedback)
      return <Feedback {...props} Self={Self} data={fullTransform(props.data)} />
    },
    ...patch,
  })
}
