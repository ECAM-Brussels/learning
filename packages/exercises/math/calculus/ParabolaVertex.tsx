import { Attempt } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { Show } from 'solid-js'
import { CompleteSquare } from '../algebra/CompleteSquare'

export const ParabolaVertex = createStep({
  schema: {
    data: { expr: 'expr' },
    inputs: { attemptx: 'expr', attempty: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>
        Détermine les coordonnées du sommet de la parabole d'équation:{' '}
        {tex`
        y = ${ctx.data.expr.expand()}
        `}
      </p>
      <Attempt>
        {tex`x =`} {ctx.inputs.attemptx} et {tex`y =`} {ctx.inputs.attempty}
      </Attempt>
    </>
  ),
  async grade(ctx) {
    const a = () => ctx.data.expr.coeff('x', 2)
    return expr('a(x-b)^2 + c')
      .subs({ a: a(), b: ctx.inputs.attemptx, c: ctx.inputs.attempty })
      .isEqual(ctx.data.expr)
  },
  feedback: (ctx) => {
    const coeff = (n: number) => ctx.data.expr.coeff('x', n)
    return (
      <Show when={!ctx.correct} fallback={<p>Parfait!</p>}>
        <CompleteSquare expr={ctx.data.expr}>
          <p>
            Tu as bien complété carré, ce qui fait apparaître les translations de la parabole.
            Réessaie maintenant!
          </p>
          <ctx.Self />
        </CompleteSquare>
      </Show>
    )
  },
})
