import MathField from '@learning/components/MathField'
import { createView, defineFeedback, defineSchema, expr } from '@learning/core'
import { Dynamic } from '@solidjs/web'
import { mapValues } from 'es-toolkit'
import { createProjection, flush, Show, type ComponentProps, type JSX } from 'solid-js'
import * as v from 'valibot'

export const schema = defineSchema({
  name: 'math/exercise',
  question: {
    fields: v.array(v.string()),
    children: v.custom<(props: object) => JSX.Element>(() => true),
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
    feedback: v.optional(v.custom<(props: object) => JSX.Element>(() => true)),
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
    const Field = (attrs: { name: string }) => {
      return (
        <MathField
          class="rounded border border-slate-200 py-2 outline-none"
          value={props.state?.state?.[attrs.name]?.rawInput ?? ''}
          onInput={(e: InputEvent & { target: HTMLInputElement }) => {
            try {
              props.setState((s) => {
                if (!s.state) s.state = {}
                s['state'][attrs.name] = e.target.value
              })
              flush()
            } catch {}
          }}
          readonly={props.correct !== undefined}
        />
      )
    }
    const innerProps = createProjection(() => ({
      ...props.question.params,
      ...Object.fromEntries(props.question.fields.map((f) => [f, <Field name={f} />])),
    }))
    return (
      <>
        {props.question.children?.(innerProps)}
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
            <div>
              <Show when={!props.correct && props.question.feedback}>
                {(feedback) => (
                  <Dynamic
                    component={feedback()}
                    {...props.question.params}
                    {...props.state?.state}
                  />
                )}
              </Show>
            </div>
          </div>
        </Show>
      </>
    )
  },
})

type PartialProps = Omit<
  ComponentProps<typeof _Exercise>,
  'fields' | 'grade' | 'children' | 'params' | 'feedback'
>

export function Exercise<const F extends string, D extends Record<string, any> = {}>(
  props: PartialProps & {
    fields: F[]
    params?: (() => D) | D
    grade: (
      props: { [K in F]: NonNullable<ReturnType<typeof expr>> } & D,
    ) => Promise<boolean> | boolean
    children: (props: D & { [K in F]: JSX.Element }) => JSX.Element
    feedback?: (props: { [K in F]: NonNullable<ReturnType<typeof expr>> } & D) => JSX.Element
  },
): JSX.Element {
  return _Exercise(props as any)
}

export default Exercise
