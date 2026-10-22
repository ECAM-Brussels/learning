import { Attempt } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { createMemo, Match, Switch } from 'solid-js'

export const MakeSquaredBinomial = createStep({
  schema: {
    data: { expr: 'expr' },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>
        Quel nombre permet de compléter l'expression:
        {tex`
        ${ctx.data.expr} + \ldots
        `}
      </p>
      <p>afin que ce soit un produit remarquable?</p>
      <Attempt>{ctx.inputs.attempt}</Attempt>
    </>
  ),
  grade: async (ctx) => {
    const answer = expr('(b / 2)^2').subs({ b: ctx.data.expr.coeff('x', 1) })
    return ctx.inputs.attempt.isEqual(answer)
  },
  feedback: (ctx) => {
    const answer = createMemo(() => expr('(b / 2)^2').subs({ b: ctx.data.expr.coeff('x', 1) }))
    const correct = createMemo(() => ctx.inputs.attempt.isEqual(answer()))
    const coeff = (n: number) => ctx.data.expr.coeff('x', n)
    const a = () => coeff(2)
    const b = () => coeff(1)
    const completeExpr = () =>
      expr('ax^2 + bx + c').subs({ a: a(), b: b(), c: ctx.inputs.attempt }).expand()
    const rootAttempt = () => expr('\\sqrt{c}').subs({ c: ctx.inputs.attempt }).simplify()
    const exprToExpand = () => expr('(x + r)^2').subs({ r: rootAttempt() })
    return (
      <Switch
        fallback={<p>En effet, le terme correct est {tex`${answer()}=${answer().simplify()}`} .</p>}
      >
        <Match when={!correct() && b().gt(0)}>
          <p class="mt-4">
            Cela voudrait dire que {tex`${completeExpr()} = (x + ${rootAttempt()})^2`}, ce qui est
            faux! Fais attention au <em>double produit</em> !
          </p>
          <ctx.Self />
        </Match>
        <Match when={!correct() && b().lt(0)}>
          <p>
            Cela voudrait dire que {tex`${completeExpr()} = (x - ${rootAttempt()})^2`}, ce qui est
            faux! Fais attention au <em>double produit</em> !
          </p>
          <ctx.Self />
        </Match>
      </Switch>
    )
  },
})
