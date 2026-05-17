import CheckMark from '@learning/components/CheckMark'
import { tex } from '@learning/components/Latex'
import { type Feedback, type View } from '@learning/core'
import type { schema } from '../factor'

export const feedback: Feedback<typeof schema, 'root'> = async ({
  question: { expr: question },
  state: { root },
}) => {
  const correct = await question.checkRoot(root)
  return { correct, score: [0, 0], next: correct ? 'start' : 'root' }
}

export const Component: View<typeof schema, 'root'> = (props, { Field, Feedback }) => (
  <>
    <p>
      Trouvez une racine de <Field name="question.expr" />
    </p>
    <div class="flex items-center justify-center gap-1">
      <p>Racine:</p>
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
