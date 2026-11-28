import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { createMemo, Match, Switch } from 'solid-js'
import { Derivative } from './Derivative'

/**
 * Asks for the antiderivatives of a function of `x`.
 * The answer must have the function as derivative and a constant, such as `+ C`:
 * without it, the student is asked whether it is the only solution.
 * After another wrong answer, the student is asked to differentiate their answer, then to try again.
 *
 * @example
 * <Antiderivative id="primitive" expr="3x^2 + 2x" />
 */
export const Antiderivative = createStep({
  name: 'math/calculus/antiderivative',
  schema: {
    data: {
      /** The function of `x` to integrate, in LaTeX. */
      expr: 'expr',
    },
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

/**
 * Asks for a definite integral.
 * After a wrong answer, the student is guided through `Antiderivative`, whose remediation follows, then asked again:
 * three levels of help, without writing any.
 *
 * @example
 * <Integrate id="integrale" expr="3x^2 + 2x" low="0" high="2" />
 */
export const Integrate = createStep({
  name: 'math/calculus/integrate',
  schema: {
    data: {
      /** The function of `x` to integrate, in LaTeX. */
      expr: 'expr',
      /** The lower bound, in LaTeX. */
      low: 'expr',
      /** The upper bound, in LaTeX. */
      high: 'expr',
    },
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
  grade: (ctx) =>
    ctx.inputs.attempt.isEqual(ctx.data.expr.integrate('x', ctx.data.low, ctx.data.high)),
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
