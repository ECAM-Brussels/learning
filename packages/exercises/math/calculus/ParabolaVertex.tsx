import { Attempt } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { createMemo, Match, Switch } from 'solid-js'
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
        y = ${ctx.data.expr}
        `}
      </p>
      <Attempt>
        {tex`x =`} {ctx.inputs.attemptx} et {tex`y =`} {ctx.inputs.attempty}
      </Attempt>
    </>
  ),
  async grade(ctx) {
    const a = () => ctx.data.expr.coeff('x', 2)
    return expr('a ( x - b )^2 + c')
      .subs({ a: a(), b: ctx.inputs.attemptx, c: ctx.inputs.attempty })
      .isEqual(ctx.data.expr)
  },
  feedback: (ctx) => {
    const coeff = (n: number) => ctx.data.expr.coeff('x', n)
    const a = () => coeff(2)
    const b = () => coeff(1)
    const c = () => coeff(0)
    const xVertex = () => expr('-b / (2a) ').subs({ a: a(), b: b() }).simplify()
    const yVertex = () => expr('c - (b^2) / (4a)').subs({ a: a(), b: b(), c: c() }).simplify()
    const completedSquare = () =>
      expr('a ( x - b )^2 + c ').subs({ a: a(), b: xVertex(), c: yVertex() }).simplify()
    return (
      <Switch
        fallback={
          <p class="text-right">
            Parfait! En effet, en complétant le carré, on voit que{' '}
            {tex`
            ${ctx.data.expr} = ${completedSquare()},
            `}
            donc il y a bien une translation de {tex`${xVertex()}`} en {tex`x`}, et de{' '}
            {tex`${yVertex()}`} en {tex`y`}.
          </p>
        }
      >
        <Match when={!ctx.correct}>
          <>
            <p class="text-right">
              Pour faire apparaître les translations de la parabole, je te propose d'abord
              l'exercice suivant:
            </p>
            <CompleteSquare expr={ctx.data.expr}>
              {(CompleteSquareCtx) => (
                <>
                  <p class="text-right">
                    Tu as bien complété le carré, ce qui fait apparaître les translations de la
                    parabole. Réessaie maintenant!
                  </p>
                  <ParabolaVertex
                    expr={CompleteSquareCtx.inputs.attempt}
                    feedback={(retryCtx) => {
                      const coeff = (n: number) => ctx.data.expr.coeff('x', n)
                      const a = () => coeff(2)
                      const b = () => coeff(1)
                      const c = () => coeff(0)
                      const xVertex = () => expr('-b / (2a) ').subs({ a: a(), b: b() }).simplify()
                      const yVertex = () =>
                        expr('c - (b^2) / (4a)').subs({ a: a(), b: b(), c: c() }).simplify()
                      const xVertexIsCorrect = createMemo(() =>
                        retryCtx.inputs.attemptx.isEqual(xVertex()),
                      )
                      const yVertexIsCorrect = createMemo(() =>
                        retryCtx.inputs.attempty.isEqual(yVertex()),
                      )
                      return (
                        <Switch fallback={<p class="text-right">Parfait!</p>}>
                          <Match when={!xVertexIsCorrect() && !yVertexIsCorrect()}>
                            <>
                              <p class="text-right">Les deux translations sont fausses!</p>
                              <retryCtx.Self />
                            </>
                          </Match>

                          <Match when={!yVertexIsCorrect()}>
                            <>
                              <p class="text-right">
                                La translation en {tex`x`} est correcte, mais pas celle en {tex`y`}
                                &nbsp;!
                              </p>
                              <retryCtx.Self />
                            </>
                          </Match>
                          <Match when={!xVertexIsCorrect()}>
                            <>
                              <p class="text-right">
                                La translation en {tex`y`} est correcte, mais pas celle en {tex`x`}
                                &nbsp;!
                              </p>
                              <retryCtx.Self />
                            </>
                          </Match>
                        </Switch>
                      )
                    }}
                  />
                </>
              )}
            </CompleteSquare>
          </>
        </Match>
      </Switch>
    )
  },
})
