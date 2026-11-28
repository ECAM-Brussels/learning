import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { Show } from 'solid-js'

/**
 * Asks for a root of an expression: any value that makes it 0 is right.
 * After a wrong answer, the question is asked again.
 * `Factor` uses it in its remediation, and passes the root found to the next step.
 *
 * @example
 * <Root id="racine" expr="x^2 - 5x + 6" />
 */
export const Root = createStep({
  name: 'math/algebra/root',
  schema: {
    data: {
      /** The expression, in `x`, in LaTeX. */
      expr: 'expr',
    },
    inputs: { root: 'expr' },
  },
  grade: (ctx) => ctx.data.expr.checkRoot(ctx.inputs.root),
  prompt: (ctx) => (
    <>
      <p>Déterminez une racine de {tex`${ctx.data.expr}`}</p>
      <Attempt>
        {tex`x =`} {ctx.inputs.root}
      </Attempt>
    </>
  ),
  feedback: (root) => (
    <Show when={!root.correct}>
      <root.Self />
    </Show>
  ),
})
