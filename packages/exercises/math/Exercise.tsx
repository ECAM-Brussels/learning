import MathField from '@learning/components/MathField'
import { createView, defineFeedback, defineSchema, expr, Expression } from '@learning/core'
import type { Quantity } from 'packages/core/src/expr'
import {
  createMemo,
  createProjection,
  createSignal,
  Errored,
  flush,
  Show,
  type ComponentProps,
  type JSX,
  type ParentComponent,
} from 'solid-js'
import * as v from 'valibot'

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type Feedback = {
  when?: 'correct' | 'incorrect' | 'always'
  correct?: boolean
}

export const schema = defineSchema({
  name: 'math/exercise',
  question: {
    inputs: v.optional(v.array(v.string()), ['attempt']),
    quantities: v.optional(v.array(v.string()), []),
    children: v.custom<(props: object, Feedback: ParentComponent<Feedback>) => JSX.Element>(
      () => true,
    ),
    params: v.optional(
      v.union([
        v.record(v.string(), v.any()),
        v.pipe(
          v.custom<() => Record<string, any>>(() => true),
          v.transform((fn) => fn()),
        ),
      ]),
      {},
    ),
    grade: v.custom<(props: object) => Promise<boolean> | boolean>(() => true),
  },
  steps: {
    start: {
      state: {
        state: v.optional(
          v.union([
            v.record(
              v.string(),
              v.union([
                v.pipe(
                  v.string(),
                  v.transform((s) => expr(s)),
                ),
                v.pipe(
                  v.tuple([v.string(), v.string()]),
                  v.transform((qty) => {
                    return expr(qty[0], qty[1])
                  }),
                ),
              ]),
            ),
            v.record(v.string(), v.any()),
          ]),
          {},
        ),
      },
    },
  },
})

export const feedback = defineFeedback<typeof schema>({
  start: async ({ question: { grade, params }, state: { state } }) => {
    try {
      const correct = await grade({ ...state, ...params })
      return { correct, score: [Number(correct), 1] as const, next: null }
    } catch (error) {
      console.error('Error during grading:', error)
      return { correct: false, score: [0, 1] as const, next: null }
    }
  },
})

const _Exercise = createView(schema, feedback, {
  start: (props) => {
    const Field = (attrs: { name: string }) => {
      const [element, setElement] = createSignal<any>(null)
      const quantity = createMemo(() => props.question.quantities?.includes(attrs.name))
      const value = createMemo(() => {
        const input = props.state?.state?.[attrs.name]?.rawInput
        if (!quantity()) return input ?? ''
        if (props.correct === undefined)
          return String.raw`\placeholder[magnitude]{${input?.[0] ?? ''}} \placeholder[unit]{${input?.[1] ?? ''}}`
        return input.join(' ')
      })
      return (
        <MathField
          style={{ padding: 0 }}
          class="rounded border border-slate-200 py-2 outline-none"
          ref={setElement}
          value={value()}
          onInput={(e: InputEvent & { target: HTMLInputElement }) => {
            if (quantity()) {
              const magnitude = element().getPromptValue('magnitude') ?? ''
              const unit = element().getPromptValue('unit') ?? ''
              props.setState((s) => {
                if (!s.state) s.state = {}
                s.state[attrs.name] = [magnitude, unit]
              })
            } else {
              props.setState((s) => {
                if (!s.state) s.state = {}
                s.state[attrs.name] = e.target.value
              })
            }
            flush()
          }}
          readonly={props.correct !== undefined || quantity()}
        />
      )
    }

    const Feedback: ParentComponent<Feedback> = (attrs) => {
      const correct = createMemo(() => attrs.correct ?? props.correct)
      const when = createMemo(() => {
        const conditions: Record<NonNullable<typeof attrs.when>, boolean> = {
          correct: correct() === true,
          incorrect: correct() === false,
          always: true,
        }
        return props.state && conditions[attrs.when ?? 'incorrect']
      })
      return (
        <Show when={when()}>
          <div
            class={[
              'my-4 rounded-xl p-4',
              {
                'bg-green-50 p-4 text-green-900': correct() === true,
                'bg-red-50 text-red-900': correct() === false,
              },
            ]}
          >
            {attrs.children}
          </div>
        </Show>
      )
    }

    const innerProps = createProjection(() => ({
      ...props.question.params,
      ...Object.fromEntries(props.question.inputs.map((f) => [f, <Field name={f} />])),
      state: props.state?.state,
    }))

    return (
      <Errored fallback={(error) => <pre>{String(error)}</pre>}>
        {props.question.children?.(innerProps, Feedback)}
      </Errored>
    )
  },
})

type PartialProps = Omit<
  ComponentProps<typeof _Exercise>,
  'inputs' | 'grade' | 'children' | 'params' | 'feedback'
>

export function Exercise<
  const F extends string = 'attempt',
  Q extends F | never = never,
  D extends Record<string, any> = {},
>(
  props: PartialProps & {
    inputs?: F[]
    quantities?: Q[]
    params?: (() => D) | D
    grade: (
      props: Prettify<{ [K in F]: K extends Q ? Quantity : Expression<'output'> } & D>,
    ) => Promise<boolean> | boolean
    children: (
      props: Prettify<
        D & { [K in F]: JSX.Element } & {
          state?: { [K in F]: K extends Q ? Quantity : Expression<'output'> }
        }
      >,
      Feedback: ParentComponent<Feedback>,
    ) => JSX.Element
  },
): JSX.Element {
  return _Exercise(props as any)
}

export default Exercise
