import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { createMemo, Match, Switch } from 'solid-js'

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
  feedback: (ctx) => {
    const equal = createMemo(() => ctx.inputs.attempt.isEqual(ctx.data.expr))
    const expanded = createMemo(() => ctx.inputs.attempt.isExpanded())

    return (
      <Switch>
        <Match when={!equal()}>
          <p>Ton développement n'est pas correct.</p>
          <ctx.Self />
        </Match>
        <Match when={!expanded()}>
          <p>Tu n'as pas entièrement développé ta réponse.</p>
          <ctx.Self />
        </Match>
      </Switch>
    )
  },
})
