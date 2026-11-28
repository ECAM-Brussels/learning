import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'

/**
 * Asks for the derivative of a function of `x`.
 * The answer must equal the derivative, however it is written.
 *
 * @example
 * <Derivative id="derivee" f="x^3 - 2x" />
 */
export const Derivative = createStep({
  schema: {
    data: {
      /** The function of `x` to differentiate, in LaTeX, such as `'x^3 - 2x'`. */
      f: 'expr',
    },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>Calculez la dérivée de {tex`${ctx.data.f}`}</p>
      <Attempt>
        {tex`
          \frac{\mathrm d}{\mathrm d x}
          \left.${ctx.data.f} \right| =
        `}{' '}
        {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  grade: (ctx) => ctx.data.f.diff().isEqual(ctx.inputs.attempt),
})
