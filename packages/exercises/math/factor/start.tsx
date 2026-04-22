import CheckMark from '@learning/components/CheckMark'
import Latex from '@learning/components/Latex'
import type { Feedback, View } from '@learning/core'
import { createMemo, Show } from 'solid-js'
import type { schema } from '../factor'

export const feedback: Feedback<typeof schema, 'start'> = async ({
  question: { expr: question },
  state: { attempt },
}) => {
  const [equal, factored] = await Promise.all([attempt.isEqual(question), attempt.isFactored()])
  const correct = equal && factored
  return { correct, score: [Number(correct), 1], next: correct ? null : 'root' }
}

export const Component: View<typeof schema, 'start'> = (props, Field) => {
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
}
