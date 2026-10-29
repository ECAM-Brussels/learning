import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { createMemo, Match, Switch } from 'solid-js'
import { Derivative } from './Derivative'

export const Antiderivative = createStep({
  name: 'math/calculus/antiderivative',
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
      hasSymbol: ctx.inputs.attempt
        .subtract(answer)
        .simplify()
        .apply()
        .then((e) => e.hasSymbol()),
      isAntiderivative: ctx.inputs.attempt.diff('x').isEqual(ctx.data.expr),
    })
    return isAntiderivative && hasSymbol
  },
  feedback: (ctx) => {
    const answer = () => ctx.data.expr.integrate('x')
    const hasSymbol = createMemo(async () =>
      ctx.inputs.attempt
        .subtract(answer())
        .simplify()
        .apply()
        .then((e) => e.hasSymbol()),
    )
    const isAntiderivative = createMemo(() => ctx.inputs.attempt.diff('x').isEqual(ctx.data.expr))
    return (
      <Switch>
        <Match when={isAntiderivative() && !hasSymbol()}>
          <p>Est-ce l'unique solution ?</p>
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
  name: 'math/calculus/integrate',
  schema: {
    data: { expr: 'expr', low: 'expr', high: 'expr' },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>
        Calcule l'<strong>intégrale définie</strong> suivante&nbsp;:
      </p>
      <Attempt>
        {tex.display`\int_{${ctx.data.low}}^{${ctx.data.high}} ${ctx.data.expr} \, \mathrm{d}x =`}{' '}
        {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  async grade(ctx) {
    const equal = await ctx.inputs.attempt.isEqual(
      ctx.data.expr.integrate('x', ctx.data.low, ctx.data.high),
    )
    return [equal, { equal }]
  },
  feedback: (ctx) => (
    <Switch>
      <Match when={!ctx.correct}>
        <Antiderivative expr={ctx.data.expr}>
          <ctx.Self />
        </Antiderivative>
      </Match>
    </Switch>
  ),
})
