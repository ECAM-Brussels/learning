import CheckMark from '@learning/components/CheckMark'
import Latex from '@learning/components/Latex'
import { createView, defineFeedback, defineSchema, Math } from '@learning/core'
import { createMemo, Show } from 'solid-js'

export const schema = defineSchema({
  name: 'math/factor',
  question: { expr: Math('Expression à factoriser') },
  transform: async (question) => ({ expr: await question.expr.expand().latex() }),
  steps: {
    start: {
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
    const answer = createMemo(() => attempt() && question().factor())
    const equal = createMemo(() => attempt()?.isEqual(question()))
    const factored = createMemo(() => attempt()?.isFactored())
    const correct = createMemo(() => equal() && factored())
    return (
      <>
        <p>Factorisez l'expression suivante:</p>
        <div class="flex items-center justify-center gap-1">
          <Field name="question.expr" />
          <Latex value="=" />
          <Field name="state.attempt" />
          <CheckMark value={correct()} />
        </div>
        <Show when={answer()}>
          <p>
            La réponse est <Latex value={answer()!} />
          </p>
        </Show>
      </>
    )
  },
})
