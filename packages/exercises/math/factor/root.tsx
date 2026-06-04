import CheckMark from '@learning/components/CheckMark'
import { Feedback } from '@learning/components/Feedback'
import { type StepFeedback, type View, tex } from '@learning/core'
import type { schema } from '../factor'

export const feedback: StepFeedback<typeof schema, 'root'> = async ({
  question: { expr: question },
  state: { root },
}) => {
  const correct = await question.checkRoot(root)
  return { correct, score: [0, 0], next: correct ? 'factorFromRoot' : null }
}

export const Component: View<typeof schema, 'root'> = (props, { Field }) => (
  <>
    <p>Trouvez une racine de {tex`y = ${props.question.expr}`}.</p>
    <div class="flex items-center justify-center gap-1">
      {tex`x =`}
      <Field name="state.root" />
      <CheckMark value={props.correct} />
    </div>
    <Feedback>
      <p>
        En remplaçant {tex`x = ${props.state!.root}`}, on obtient{' '}
        {tex`y = ${props.question.expr.subs({ x: props.state!.root.json })}`}
      </p>
    </Feedback>
  </>
)
