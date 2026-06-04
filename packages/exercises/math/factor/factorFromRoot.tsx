import { CheckMark, Feedback } from '@learning/components'
import { type StepFeedback, type View, tex } from '@learning/core'
import { createMemo } from 'solid-js'
import type { schema } from '../factor'

export const feedback: StepFeedback<typeof schema, 'factorFromRoot'> = async ({
  question: { expr: question },
  state: { factor },
  previous: [{ root }],
}) => {
  const [equal, valid] = await Promise.all([
    factor.isEqual(`x - (${root.rawInput})`),
    question.checkRoot(root),
  ])
  const correct = equal && valid
  return { correct, score: [0, 0], next: correct ? 'start' : null }
}

export const Component: View<typeof schema, 'factorFromRoot'> = (props, { Field }) => {
  const root = () => props.previous[0].root
  const y = createMemo(() => props.state?.factor.subs({ x: root() }))
  return (
    <>
      <p>La valeur {tex`x = ${root()}`} est en effet une racine.</p>
      <p>Quel est le facteur associé ?</p>
      <Field name="state.factor" />
      <CheckMark value={props.correct} />
      <Feedback>
        <p>
          Une expression et sa factorisation doivent être <strong>égales</strong>, et donc les deux
          doivent avoir {tex`x = ${root()}`} comme racine.
        </p>
        <p>
          On vérifie cependant qu'en remplaçant {tex`x = ${root()}`} dans{' '}
          {tex`${props.state?.factor}`}, on obtient {tex`${y()}`} et non {tex`0`}.
        </p>
      </Feedback>
    </>
  )
}
