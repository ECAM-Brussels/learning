import CheckMark from '@learning/components/CheckMark'
import { createView, defineFeedback, defineSchema } from '@learning/core'
import { flush, For, type ComponentProps, type JSX } from 'solid-js'
import * as v from 'valibot'

export const schema = defineSchema({
  name: 'MultipleChoice',
  question: {
    choices: v.pipe(
      v.record(
        v.string(),
        v.custom<JSX.Element>(() => true),
      ),
      v.transform(
        (record) =>
          ({
            ...record,
            toJSON() {
              return undefined
            },
          }) as unknown as typeof record,
      ),
    ),
    children: v.pipe(
      v.custom<JSX.Element>(() => true),
      v.transform((value) =>
        Object.assign(value as any, {
          toJSON() {
            return undefined
          },
        }),
      ),
    ),
    grade: v.custom<(selection: string[]) => Promise<boolean> | boolean>(() => true),
  },
  steps: {
    start: {
      state: {
        selected: v.array(v.string()),
      },
    },
  },
})

export const feedback = defineFeedback<typeof schema>({
  start: async ({ question: { grade }, state: { selected } }) => {
    const correct = await grade(selected)
    return { correct, score: [Number(correct), 1] as const, next: null }
  },
})

const _MultipleChoice = createView(schema, feedback, {
  start: (props) => (
    <>
      {props.question.children}
      <div class="align-center my-2 flex items-center gap-8">
        <For each={Object.entries(props.question.choices).filter(([key]) => key !== 'toJSON')}>
          {(entry) => (
            <label class="block rounded border border-gray-200 px-4 py-2 shadow">
              <input
                class="mr-2"
                type="checkbox"
                disabled={props.state !== undefined}
                name={entry()[0]}
                checked={props.state?.selected?.includes(entry()[0])}
                onChange={(e) => {
                  props.setState((s) => {
                    s['selected'] = s['selected'] ?? []
                    if (e.target.checked) {
                      s['selected'].push(entry()[0])
                    } else {
                      s['selected'] = s['selected'].filter((v: string) => v !== entry()[0])
                    }
                  })
                  flush()
                }}
              />{' '}
              {entry()[1]}
            </label>
          )}
        </For>
        <CheckMark value={props.correct} />
      </div>
    </>
  ),
})

export const MultipleChoice = <C extends string>(
  props: Omit<ComponentProps<typeof _MultipleChoice>, 'grade' | 'choices'> & {
    grade: (selection: C[]) => Promise<boolean> | boolean
    choices: Record<C, JSX.Element>
  },
) => _MultipleChoice(props as any)

export default MultipleChoice
