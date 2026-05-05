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
    label: Text('Libellé de la réponse'),
    encryptedAnswer: Text('Réponse chiffrée'),
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
  start: async ({ question: { encryptedAnswer }, state: { attempt } }) => {
    const correct = await compare(attempt.json, encryptedAnswer)
    return { correct, score: [Number(correct), 1], next: null }
  },
})

const Component = createView(schema, feedback, {
  start: (props, Field) => {
    const attempt = createMemo(() => props.state?.attempt)
    const encrypted = createMemo(() => props.question.encryptedAnswer)
    const correct = createMemo(() => attempt() && compare(attempt()!.json, encrypted()))
    return (
      <div class="flex items-center justify-start gap-4">
        <Field name="question.label" />
        <Field name="state.attempt" />
        <CheckMark value={correct()} />
      </div>
    )
  },
})

async function compare(json: Parameters<typeof expr>[0], encrypted: string) {
  'use server'
  const latex = await decrypt(encrypted)
  return symapi.expr.equal({ expr1: json, expr2: expr(latex).json })
}

export default Component
