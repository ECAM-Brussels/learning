import { createView, defineFeedback, defineSchema, Math } from '@learning/core'
import { createMemo, Show } from 'solid-js'

export const schema = defineSchema({
  name: 'math/factor',
  question: { expr: Math('Expression à factoriser') },
  transform: async (question) => ({ expr: await question.expr.expand().latex() }),
  steps: {
    start: {
      previous: [],
      state: {
        attempt: Math('Tentative'),
      },
    },
  },
})

export const feedback = defineFeedback<typeof schema>({
  start: async ({ question: { expr: question }, state: { attempt } }) => {
    const [equal, factored] = await Promise.all([attempt.isEqual(question), attempt.isFactored()])
    const correct = equal && factored
    return { correct, score: [Number(correct), 1], next: null }
  },
})

export default createView(schema, feedback, {
  start: (props, Field) => {
    const question = createMemo(() => props.question.expr)
    const attempt = createMemo(() => props.state?.attempt)
    const answer = createMemo(() => attempt() && question().factor().latex())
    const equal = createMemo(() => attempt()?.isEqual(question()))
    const factored = createMemo(() => attempt()?.isFactored())
    const correct = () => equal() && factored()
    return (
      <>
        <p>
          Factorisez l'expression suivante: <Field name="question.expr" />
        </p>
        <p>
          Tentative: <Field name="state.attempt" />
        </p>
        <Show when={attempt()}>
          <p>La réponse est {answer()}</p>
          <Show when={correct() !== undefined}>
            <p>Correct: {correct() ? 'Oui' : 'Non'}</p>
          </Show>
        </Show>
      </>
    )
  },
})
