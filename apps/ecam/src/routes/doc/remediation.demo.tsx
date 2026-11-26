import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { Factor } from '@learning/exercises/math/algebra/Factor'
import { Show } from 'solid-js'

export const Limit = createStep({
  schema: {
    data: { numerator: 'expr', denominator: 'expr', a: 'expr', limit: 'expr' },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>Calculez la limite suivante.</p>
      <Attempt>
        {tex`\lim_{x \to ${ctx.data.a}} \frac{${ctx.data.numerator}}{${ctx.data.denominator}} =`}{' '}
        {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  grade: (ctx) => ctx.inputs.attempt.isEqual(ctx.data.limit),
  feedback: (ctx) => (
    <Show when={!ctx.correct}>
      <p>
        En {tex`x = ${ctx.data.a}`}, le numérateur et le dénominateur s'annulent. Commencez par
        factoriser le numérateur.
      </p>
      <Factor expr={ctx.data.numerator}>
        <p>Simplifiez maintenant la fraction, puis calculez à nouveau la limite.</p>
        <ctx.Self />
      </Factor>
    </Show>
  ),
})
