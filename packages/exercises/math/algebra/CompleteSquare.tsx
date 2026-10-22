import { Attempt, Scope } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { Expand } from '@learning/exercises/math/algebra/Expand'
import { MakeSquaredBinomial } from '@learning/exercises/math/algebra/MakeSquaredBinomial'
import { allKeyed } from 'es-toolkit/promise'
import { createMemo, Match, Show, Switch } from 'solid-js'

export const CompleteSquare = createStep({
  name: 'math/algebra/complete-square',
  schema: {
    data: { expr: 'expr' },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>Complète le carré:</p>
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
    const attempt = () => ctx.inputs.attempt
    const hasOneX = createMemo(() => attempt().count('x') === 1)
    const degree = createMemo(() => attempt().degree())
    const isExpanded = createMemo(() => attempt().isExpanded())

    return (
      <Switch>
        <Match when={degree() !== 2 || !hasOneX() || isExpanded()}>
          <p class="mt-4">
            L'objectif de l'exercice est d'écrire l'expression donnée sous la forme
            {tex`
            a(x - \alpha)^2 + \beta`}
            Réessaie!
          </p>
          <ctx.Self />
        </Match>
        <Match when={degree() === 2}>
          <Scope>
            {() => {
              const coeff = (n: number) => ctx.data.expr.coeff('x', n)
              const correctCoeff = (n: number) => attempt().coeff('x', n).isEqual(coeff(n))
              const a = () => coeff(2)
              const b = () => coeff(1)
              const c = () => coeff(0)
              const correctA = createMemo(() => correctCoeff(2))
              const correctB = createMemo(() => correctCoeff(1))
              const correctC = createMemo(() => correctCoeff(0))
              const partialPoly = () => expr('x^2 + (b/a)x').subs({ a: a(), b: b() }).expand()
              const testMonic = createMemo(() => a().isEqual(1))
              return (
                <Switch fallback={<p class="mt-4">Parfait!</p>}>
                  <Match when={!correctA()}>
                    <>
                      <p class="mt-4">
                        Le coefficient de {tex`x^2`} n'est pas correct!{' '}
                        <Show when={!testMonic()}>
                          Indice: commence par mettre en évidence le coefficient de {tex`x^2`}.
                        </Show>
                      </p>
                      <ctx.Self />
                    </>
                  </Match>
                  <Match when={!correctB() && testMonic()}>
                    <>
                      <p class="mt-4">Ton produit remarquable n'est pas correct.</p>
                      <MakeSquaredBinomial expr={partialPoly()}>
                        {(MakeSquaredBinomialCtx) => (
                          <>
                            <p class="mt-4">
                              Super, tu as trouvé le bon produit remarquable:{' '}
                              {tex`${expr('(x + b/2)^2').subs({ b: b() }).simplify()}`}. Réessaie
                              maintenant!
                            </p>
                            <ctx.Self />
                          </>
                        )}
                      </MakeSquaredBinomial>
                    </>
                  </Match>
                  <Match when={!correctB()}>
                    <>
                      <p class="mt-4">
                        Ton produit remarquable n'est pas correct. Indice: il faut d'abord mettre en
                        évidence le facteur {tex`${a()}`}:{' '}
                        {tex`
                        ${ctx.data.expr.expand()} = ${a()}( ${partialPoly()} + \ldots )
                        `}
                      </p>
                      <MakeSquaredBinomial expr={partialPoly()}>
                        {(MakeSquaredBinomialCtx) => (
                          <>
                            <p class="mt-4">
                              Super, tu as trouvé le bon produit remarquable:{' '}
                              {tex`${expr('(x + b/(2a))^2').subs({ a: a(), b: b() }).simplify()}`}.
                              Réessaie maintenant!
                            </p>
                            <ctx.Self />
                          </>
                        )}
                      </MakeSquaredBinomial>
                    </>
                  </Match>
                  <Match when={!correctC()}>
                    <>
                      <p class="mt-4">
                        Ton produit remarquable est correct, mais pas le terme constant.
                      </p>
                      <Expand expr={attempt()}>
                        {(expandCtx) => (
                          <>
                            <p class="mt-4">
                              On voit que le développement de ta réponse{' '}
                              {tex`${expandCtx.inputs.attempt.simplify()}`} n'a pas le même terme
                              constant que l'expression de départ. Réessaie!
                            </p>
                            <ctx.Self />
                          </>
                        )}
                      </Expand>
                    </>
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
