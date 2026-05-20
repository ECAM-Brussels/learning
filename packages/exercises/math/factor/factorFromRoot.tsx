import CheckMark from '@learning/components/CheckMark'
import { tex } from '@learning/components/Latex'
import { expr, type Feedback, type View } from '@learning/core'
import type { schema } from '../factor'

export const feedback: Feedback<typeof schema, 'factorFromRoot'> = async ({
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

export const Component: View<typeof schema, 'factorFromRoot'> = (props, { Field, Feedback }) => (
  <>
    <p>La valeur {tex`x = ${props.previous[0]?.root}`} est en effet une racine.</p>
    <p>Quel est le facteur associé ?</p>
    <Field name="state.factor" />
    <CheckMark value={props.correct} />
    <Feedback>
      <p>
        Souviens-toi que le facteur doit également avoir {tex`x = ${props.previous[0].root}`} comme
        racine. On vérifie que c'est bien le cas de{' '}
        {tex`${expr(`x - ${props.previous[0].root.rawInput}`).simplify()}`}.
      </p>
    </Feedback>
  </>
)
