import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { Match, Switch } from 'solid-js'

export const Expand = createStep({
  name: 'math/algebra/expand',
  schema: {
    data: { expr: 'expr' },
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
    return [equal && expanded, { equal, expanded }]
  },
  feedback: (ctx) => (
    <Switch>
      <Match when={!ctx.correct}>
        <ctx.Self />
      </Match>
    </Switch>
  ),
})
