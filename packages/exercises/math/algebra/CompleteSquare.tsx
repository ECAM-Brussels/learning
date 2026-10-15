import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit/promise'
import { Match, Switch } from 'solid-js'

export const CompleteSquare = createStep({
  name: 'math/algebra/complete-square',
  schema: {
    data: { expr: 'expr' },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>
        Test: l'expression a un coefficient de {tex`x^2`} qui vaut{' '}
        {tex`${ctx.data.expr.coeff('x', 2)}`}{' '}
      </p>
      <p>Complétez le carré:</p>
      <Attempt>
        {tex`${ctx.data.expr.expand()} =`} {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  async grade(ctx) {
    const { hasOneX, equal } = await allKeyed({
      hasOneX: ctx.inputs.attempt.count('x') === 1,
      equal: ctx.inputs.attempt.isEqual(ctx.data.expr),
    })
    return [hasOneX && equal, { hasOneX, equal }]
  },
  feedback: (ctx) => {
    return (
      <Switch>
        <Match when={!ctx.feedback.hasOneX}>
          <p>
            L'objectif de l'exercice est d'écire l'expression donnée sous la forme
            {tex`
            a(x - \alpha)^2 \pm \beta^2`}
            Réessayez!
          </p>
          <ctx.Self />
        </Match>
        <Match when={ctx.feedback.hasOneX && ctx.feedback.equal}>
          <p> On dirait que c'est bon.</p>
        </Match>
      </Switch>
    )
  },
})
