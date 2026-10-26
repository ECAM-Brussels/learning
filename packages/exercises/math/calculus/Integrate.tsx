import { Attempt } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { createMemo, Match, Switch } from 'solid-js'
import { Derivative } from './Derivative'

export const Primitive = createStep({
  name: 'math/algebra/primitive',
  schema: {
    data: { expr: 'expr' },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>
        Détermine <strong>les primitives</strong>&nbsp;:
      </p>
      <Attempt>
        {tex.display`\int ${ctx.data.expr} \, \mathrm{d}x =`} {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  async grade(ctx) {
    const answer = ctx.data.expr.integrate('x')
    const { isAntiderivative, hasSymbol } = await allKeyed({
      hasSymbol: (async () =>
        expr(await ctx.inputs.attempt.subtract(answer).simplify().latex()).hasSymbol())(),
      isAntiderivative: ctx.inputs.attempt.diff('x').isEqual(ctx.data.expr),
    })
    return isAntiderivative && hasSymbol
  },
  feedback: (ctx) => {
    const answer = () => ctx.data.expr.integrate('x')
    const hasSymbol = createMemo(async () => {
      const latex = await ctx.inputs.attempt.subtract(answer()).simplify().latex()
      return expr(latex).hasSymbol()
    })
    const isAntiderivative = createMemo(() => ctx.inputs.attempt.diff('x').isEqual(ctx.data.expr))
    return (
      <Switch>
        <Match when={isAntiderivative() && !hasSymbol()}>
          <p>N'as-tu pas oublié quelque chose ?</p>
        </Match>
        <Match when={!ctx.correct}>
          <Derivative f={ctx.inputs.attempt}>
            <ctx.Self />
          </Derivative>
        </Match>
      </Switch>
    )
  },
})

export const Integrate = createStep({
  name: 'math/algebra/integrate',
  schema: {
    data: { expr: 'expr', low: 'expr', high: 'expr' },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>
        Calcule <strong>l'intégrale</strong> suivante&nbsp;:
      </p>
      <Attempt>
        {tex.display`\int_{${ctx.data.low}}^{${ctx.data.high}} ${ctx.data.expr} \, \mathrm{d}x =`}{' '}
        {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  async grade(ctx) {
    const { equal } = await allKeyed({
      equal: ctx.inputs.attempt.isEqual(ctx.data.expr.integrate('x', ctx.data.low, ctx.data.high)),
    })
    return [equal, { equal }]
  },
  feedback: (ctx) => (
    <Switch>
      <Match when={!ctx.correct}>
        <Primitive expr={ctx.data.expr}>
          <ctx.Self />
        </Primitive>
      </Match>
    </Switch>
  ),
})
