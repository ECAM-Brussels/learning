import MathField from '@learning/components/MathField'
import { createView, defineFeedback, defineSchema, expr, Expression } from '@learning/core'
import { mapValues } from 'es-toolkit'
import {
  createMemo,
  createProjection,
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
            v.pipe(
              v.record(v.string(), v.string()),
              v.transform((record) => mapValues(record, expr)),
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
    const correct = await grade({ ...state, ...params })
    return { correct, score: [Number(correct), 1] as const, next: null }
  },
})

const _Exercise = createView(schema, feedback, {
  start: (props) => {
    const Field = (attrs: { name?: string }) => {
      return (
        <MathField
          class="rounded border border-slate-200 py-2 outline-none"
          value={props.state?.state?.[attrs.name ?? 'attempt']?.rawInput ?? ''}
          onInput={(e: InputEvent & { target: HTMLInputElement }) => {
            try {
              props.setState((s) => {
                if (!s.state) s.state = {}
                s['state'][attrs.name ?? 'attempt'] = e.target.value
              })
              flush()
            } catch {}
          }}
          readonly={props.correct !== undefined}
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

export function Exercise<const F extends string = 'attempt', D extends Record<string, any> = {}>(
  props: PartialProps & {
    inputs?: F[]
    params?: (() => D) | D
    grade: (props: Prettify<{ [K in F]: Expression<'output'> } & D>) => Promise<boolean> | boolean
    children: (
      props: Prettify<
        D & { [K in F]: JSX.Element } & { state?: { [K in F]: Expression<'output'> } }
      >,
      Feedback: ParentComponent<Feedback>,
    ) => JSX.Element
  },
): JSX.Element {
  return _Exercise(props as any)
}

export default Exercise
