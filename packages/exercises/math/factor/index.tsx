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
    root: {
      state: {
        root: Math('Racine'),
      },
    },
  },
})

export const feedback = defineFeedback<typeof schema>({
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

export default createView(schema, feedback, {
  start: (props, Field) => {
    const question = createMemo(() => props.question.expr)
    const attempt = createMemo(() => props.state?.attempt)
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
        <Show when={props.state && !correct()}>
          <div class="flex items-center justify-center gap-1">
            <Field name="state.attempt" />
            <Latex value="=" />
            <Latex value={attempt()?.expand()} />
          </div>
        </Show>
      </>
    )
  },
  root: (props, Field) => {
    const root = createMemo(() => props.state?.root)
    const question = createMemo(() => props.question.expr)
    const correct = createMemo(() => root() && question().checkRoot(root()!))
    return (
      <>
        <p>
          Trouvez une racine de <Field name="question.expr" />
        </p>
        <div class="flex items-center justify-center gap-1">
          <p>Racine:</p>
          <Field name="state.root" />
          <CheckMark value={correct()} />
        </div>
      </>
    )
  },
})
