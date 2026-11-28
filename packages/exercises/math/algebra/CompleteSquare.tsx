import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'

/**
 * Asks to complete the square of a quadratic polynomial, shown expanded.
 * The answer must equal the polynomial and contain `x` only once, as in `2(x - 1)^2 + 3`.
 *
 * @example
 * <CompleteSquare id="carre" expr="2(x - 1)^2 + 3" />
 */
export const CompleteSquare = createStep({
  name: 'math/algebra/complete-square',
  schema: {
    data: {
      /** The polynomial, in LaTeX, in any form: it is shown expanded. */
      expr: 'expr',
    },
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
    if (ctx.inputs.attempt.count('x') !== 1) return false
    return ctx.data.expr.isEqual(ctx.inputs.attempt)
  },
})
