import MathField from '@learning/components/MathField'
import { createView, defineFeedback, defineSchema, type expr } from '@learning/core'
import { Show, type Component, type ComponentProps, type JSX } from 'solid-js'
import * as v from 'valibot'

type Field<N extends string> = Component<{ name: N }>

export const schema = defineSchema({
  name: 'math/multiplefields',
  question: {
    fields: v.array(v.string()),
    children: v.custom<(Field: Field<string>) => JSX.Element>(() => true),
    grade: v.custom<
      (state: Record<string, NonNullable<ReturnType<typeof expr>>>) => Promise<boolean> | boolean
    >(() => true),
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
  start: async ({ question: { grade }, state: { state } }) => {
    const correct = await grade(state)
    return { correct, score: [Number(correct), 1] as const, next: null }
  },
})

const _MultipleFields = createView(schema, feedback, {
  start: (props) => {
    const Field = (attrs: { name: string }) => {
      return (
        <MathField
          class="rounded border border-slate-200 p-2 outline-none"
          value={props.state?.state?.[attrs.name] ?? ''}
          onInput={(e: InputEvent & { target: HTMLInputElement }) => {
            props.setState((s) => {
              if (!s.state) s.state = {}
              s['state'][attrs.name] = e.target.value
            })
          }}
          readonly={props.correct !== undefined}
        />
      )
    }
    return (
      <>
        {props.question.children(Field)}
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

export function MultipleFields<const F extends string[]>(
  props: Omit<ComponentProps<typeof _MultipleFields>, 'fields' | 'grade' | 'children'> & {
    fields: F
    grade: (
      state: Record<F[number], NonNullable<ReturnType<typeof expr>>>,
    ) => Promise<boolean> | boolean
    children: (Field: Field<F[number]>) => JSX.Element
  },
) {
  return _MultipleFields(props)
}

export default MultipleFields
