import CheckMark from '@learning/components/CheckMark'
import {
  createView,
  decrypt,
  defineFeedback,
  defineSchema,
  expr,
  Math,
  symapi,
  Text,
} from '@learning/core'
import { createMemo } from 'solid-js'

export const schema = defineSchema({
  name: 'math/simple',
  question: {
    answer: Text('Réponse chiffrée'),
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
  start: async ({ question: { answer }, state: { attempt } }) => {
    const correct = await compare(attempt.json, answer)
    return { correct, score: [Number(correct), 1], next: null }
  },
})

export const Simple = createView(schema, feedback, {
  start: (props, Field) => {
    const attempt = createMemo(() => props.state?.attempt)
    const encrypted = createMemo(() => props.question.answer)
    const correct = createMemo(() => attempt() && compare(attempt()!.json, encrypted()))
    return (
      <>
        <Field name="state.attempt" />
        <CheckMark value={correct()} />
      </>
    )
  },
})

async function compare(json: Parameters<typeof expr>[0], encrypted: string) {
  'use server'
  const latex = await decrypt(encrypted)
  return symapi.expr.equal({ expr1: json, expr2: expr(latex).json })
}

export default Simple
