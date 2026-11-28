import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { Show } from 'solid-js'
import { Simple } from '../Simple'
import { Derivative } from './Derivative'

/**
 * Asks for the value of a function's derivative at a point.
 * After a wrong answer, the student is guided:
 * compute the derivative, then its value at the point.
 *
 * @example
 * <DerivativeAtPoint id="derivee-en-2" f="x^3" x="2" />
 */
export const DerivativeAtPoint = createStep({
  schema: {
    data: {
      /** The function of `x`, in LaTeX. */
      f: 'expr',
      /** The point, in LaTeX, such as `'2'` or `'\\pi'`. */
      x: 'expr',
    },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>
        Calculez la dérivée de {tex`${ctx.data.f}`} en {tex`x = ${ctx.data.x}`}
      </p>
      <Attempt>
        {tex`
          \frac{\mathrm d}{\mathrm d x}
          \left. \left( ${ctx.data.f} \right) \right|_{x = ${ctx.data.x}} =
        `}{' '}
        {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  grade: (ctx) => ctx.data.f.diff('x', ctx.data.x).isEqual(ctx.inputs.attempt),
  feedback: (ctx) => (
    <Show when={!ctx.correct}>
      <Derivative f={ctx.data.f}>
        {(derivativeCtx) => (
          <>
            <Simple
              prompt={
                <p>
                  Maintenant, évaluez {tex`${derivativeCtx.inputs.attempt}`} en{' '}
                  {tex`x = ${ctx.data.x}`}
                </p>
              }
              grade={(attempt) =>
                derivativeCtx.inputs.attempt.subs({ x: ctx.data.x }).isEqual(attempt)
              }
            />
          </>
        )}
      </Derivative>
    </Show>
  ),
})
