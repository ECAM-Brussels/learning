import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { Match, Switch } from 'solid-js'

export const CompleteSquare = createStep({
  name: 'math/algebra/complete-square',
  schema: {
    data: { expr: 'expr' },
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
  feedback: (ctx) => (
    <Switch>
      <Match when={!ctx.correct}>
        <ctx.Self />
      </Match>
    </Switch>
  ),
})
