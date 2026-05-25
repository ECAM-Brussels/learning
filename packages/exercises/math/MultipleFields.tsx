import MathField from '@learning/components/MathField'
import { createView, defineFeedback, defineSchema, type expr } from '@learning/core'
import { Show, type Component, type ComponentProps, type JSX } from 'solid-js'
import * as v from 'valibot'

type Field<N extends string> = Component<{ name: N }>

export const schema = defineSchema({
  name: 'math/multiplefields',
  question: {
    fields: v.optional(v.array(v.string()), ['attempt']),
    children: v.custom<({ Field, params }: { Field: Field<string>; params: any }) => JSX.Element>(
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
    ),
    grade: v.custom<(props: object) => Promise<boolean> | boolean>(() => true),
  },
  steps: {
    start: {
      state: {
        state: v.optional(v.record(v.string(), v.any()), {}),
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

const _MultipleFields = createView(schema, feedback, {
  start: (props) => {
    const Field = (attrs: { name?: string }) => {
      return (
        <MathField
          class="rounded border border-slate-200 p-2 outline-none"
          value={props.state?.state?.[attrs.name ?? 'attempt'] ?? ''}
          onInput={(e: InputEvent & { target: HTMLInputElement }) => {
            props.setState((s) => {
              if (!s.state) s.state = {}
              s['state'][attrs.name ?? 'attempt'] = e.target.value
            })
          }}
          readonly={props.correct !== undefined}
        />
      )
    }
    return (
      <>
        {props.question.children({ Field, params: props.question.params ?? {} })}
        <Show when={props.correct !== undefined}>
          <div
            class={[
              'my-2 rounded-xl p-4',
              {
                'bg-green-50 text-green-900': props.correct === true,
                'bg-red-50 text-red-900': props.correct === false,
              },
            ]}
          >
            {props.correct === true ? 'Correct!' : 'Incorrect!'}
          </div>
        </Show>
      </>
    )
  },
})

export function MultipleFields<const F extends string[], D extends Record<string, any>>(
  props: Omit<
    ComponentProps<typeof _MultipleFields>,
    'fields' | 'grade' | 'children' | 'params'
  > & {
    fields: F
    params?: (() => D) | D
    grade: (
      props: Record<F[number], NonNullable<ReturnType<typeof expr>>> & D,
    ) => Promise<boolean> | boolean
    children: ({ Field, params }: { Field: Field<F[number]>; params: D }) => JSX.Element
  },
) {
  return _MultipleFields(props as any)
}

export default MultipleFields
