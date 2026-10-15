import { Attempt, Scope } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { Expand } from '@learning/exercises/math/algebra/Expand'
import { allKeyed } from 'es-toolkit/promise'
import { createMemo, Match, Switch } from 'solid-js'

export const CompleteSquare = createStep({
  name: 'math/algebra/complete-square',
  schema: {
    data: { expr: 'expr' },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
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
    return hasOneX && equal
  },
  feedback: (ctx) => {
    const hasOneX = createMemo(() => ctx.inputs.attempt.count('x') === 1)
    const equal = createMemo(() => ctx.inputs.attempt.isEqual(ctx.data.expr))

    return (
      <Switch>
        <Match when={!hasOneX()}>
          <p>
            L'objectif de l'exercice est d'écire l'expression donnée sous la forme
            {tex`
            a(x - \alpha)^2 \pm \beta^2`}
            Réessayez!
          </p>
          <ctx.Self />
        </Match>
        <Match when={hasOneX()}>
          <Scope>
            {() => {
              const correctXsquaredCoeff = createMemo(() =>
                ctx.inputs.attempt.coeff('x', 2).isEqual(ctx.data.expr.coeff('x', 2)),
              )
              const correctXCoeff = createMemo(() =>
                ctx.inputs.attempt.coeff('x', 1).isEqual(ctx.data.expr.coeff('x', 1)),
              )
              const correctZeroCoeff = createMemo(() =>
                ctx.inputs.attempt.coeff('x', 0).isEqual(ctx.data.expr.coeff('x', 0)),
              )
              return (
                <Switch>
                  <Match when={!correctXsquaredCoeff()}>
                    <>
                      <p>Le coefficient de {tex`x^2`} n'est pas correct!</p>
                      <Expand expr={ctx.inputs.attempt}>
                        {(expandCtx) => (
                          <>
                            <p>
                              On voit que le développement de ta réponse{' '}
                              {tex`${expandCtx.inputs.attempt}`} n'est pas égale à l'expression de
                              départ. Réessaye!
                            </p>
                            <ctx.Self />
                          </>
                        )}
                      </Expand>
                    </>
                  </Match>
                  <Match when={correctXsquaredCoeff() && !correctXCoeff()}>Ton b est faux</Match>
                  <Match when={correctXsquaredCoeff() && correctXCoeff() && !correctZeroCoeff()}>
                    <>
                      <p>
                        Ton produit remarquable est correct, mais pas le terme constant. Vérifie:
                      </p>
                      <Expand expr={ctx.inputs.attempt}>
                        {(expandCtx) => (
                          <>
                            <p>
                              On voit que le développement de ta réponse{' '}
                              {tex`${expandCtx.inputs.attempt}`} n'a pas le même terme constant que
                              l'expression de départ. Réessaye!
                            </p>
                            <ctx.Self />
                          </>
                        )}
                      </Expand>
                    </>
                  </Match>
                  <Match when={correctXsquaredCoeff() && correctXCoeff() && correctZeroCoeff()}>
                    Bravo, tu as la bonne réponse!
                  </Match>
                </Switch>
              )
            }}
          </Scope>
        </Match>
      </Switch>
    )
  },
})
