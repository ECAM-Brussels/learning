import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { Match, Switch } from 'solid-js'

/**
 * Asks to expand an expression completely.
 * The answer must equal the expression and be expanded, however its terms are ordered.
 * After a wrong answer, the question is asked again.
 *
 * @example
 * <Expand id="developpement" expr="(x + 2)^2" />
 * // With a hint of your own after a wrong answer:
 * <Expand
 *   id="identite"
 *   expr="(x + 2)^2"
 *   feedback={(ctx) => (
 *     <Show when={!ctx.correct}>
 *       <p>Rappelez-vous que {tex`(a + b)^2 = a^2 + 2ab + b^2`}.</p>
 *       <ctx.Self />
 *     </Show>
 *   )}
 * />
 */
export const Expand = createStep({
  name: 'math/algebra/expand',
  schema: {
    data: {
      /** The expression to expand, in LaTeX, such as `'(x + 2)^2'`. */
      expr: 'expr',
    },
    inputs: { attempt: 'expr' },
  },
  prompt: (ctx) => (
    <>
      <p>
        Développe <strong>complètement</strong> l'expression suivante:
      </p>
      <Attempt>
        {tex`${ctx.data.expr} =`} {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  async grade(ctx) {
    const { equal, expanded } = await allKeyed({
      equal: ctx.inputs.attempt.isEqual(ctx.data.expr),
      expanded: ctx.inputs.attempt.isExpanded(),
    })
    return equal && expanded
  },
  feedback: (ctx) => (
    <Switch>
      <Match when={!ctx.correct}>
        <ctx.Self />
      </Match>
    </Switch>
  ),
})
