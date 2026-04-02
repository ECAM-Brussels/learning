import { createView, defineFeedback, defineSchema, Math } from '@learning/core'
import { createMemo, Show } from 'solid-js'

const schema = defineSchema({
  name: 'math/factor',
  question: { expr: Math('Expression à factoriser') },
  transform: async (question) => {
    return { expr: await question.expr.expand().latex() }
  },
  steps: {
    start: {
      state: {
        attempt: Math('Votre tentative'),
      },
    },
    root: {
      previous: ['start'],
      state: {
        root: Math('Racine'),
      },
    },
  },
})

const feedback = defineFeedback<typeof schema>({
  start: async ({ question: { expr: question }, state: { attempt } }) => {
    const [equal, factored] = await Promise.all([attempt.isEqual(question), attempt.isFactored()])
    const correct = equal && factored
    return { correct, score: [Number(correct), 1], next: correct ? null : 'root' }
  },
  root: async ({ question: { expr: question }, state: { root } }) => {
    const correct = await question.checkRoot(root)
    return { correct, score: [0, 0], next: null }
  },
})

export const Factor = createView(schema, feedback, {
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
        <Show when={props.state}>
          <p>La réponse est {answer()}</p>
        </Show>
        <Show when={correct() !== undefined}>
          <p>Correct: {correct() ? 'Oui' : 'Non'}</p>
        </Show>
      </>
    )
  },
  root: (props, Field) => {
    const correct = createMemo(() => props.state && props.question.expr.checkRoot(props.state.root))
    return (
      <>
        <p>
          Trouvez une racine de <Field name="question.expr" />
        </p>
        <Field name="state.root" />
        <Show when={correct() !== undefined}>
          <p>Correct: {correct() ? 'Oui' : 'Non'}</p>
        </Show>
      </>
    )
  },
})
