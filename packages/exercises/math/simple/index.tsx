import CheckMark from '@learning/components/CheckMark'
import { createView, defineFeedback, defineSchema, Math, Text } from '@learning/core'
import { createMemo } from 'solid-js'

export const schema = defineSchema({
  name: 'math/simple',
  question: {
    label: Text('Libellé de la réponse'),
    answer: Math('Réponse de la question'),
  },
  steps: {
    start: {
      state: {
        attempt: Math('Tentative'),
      },
    },
  },
})

const feedback = defineFeedback<typeof schema>({
  start: async ({ question: { answer: question }, state: { attempt } }) => {
    const correct = await question.isEqual(attempt)
    return { correct, score: [Number(correct), 1], next: null }
  },
})

export default createView(schema, feedback, {
  start: (props, Field) => {
    const answer = createMemo(() => props.question.answer)
    const attempt = createMemo(() => props.state?.attempt)
    const correct = createMemo(() => attempt()?.isEqual(answer()))
    return (
      <div class="flex items-center justify-start gap-4">
        <Field name="question.label" />
        <Field name="state.attempt" />
        <CheckMark value={correct()} />
      </div>
    )
  },
})
