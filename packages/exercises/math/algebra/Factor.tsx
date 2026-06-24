import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { createMemo, Match, Switch } from 'solid-js'

export const Factor = createStep({
  name: 'math/algebra/factor',
  schema: {
    data: { expr: 'expr' },
    inputs: { attempt: 'expr' },
  },
  correct: async (ctx) => {
    const { equal, factored } = await allKeyed({
      equal: ctx.inputs.attempt.isEqual(ctx.data.expr),
      factored: ctx.inputs.attempt.isFactored(),
    })
    return equal && factored
  },
  prompt: (ctx) => (
    <>
      <p>
        Factorise <strong>complètement</strong> l'expression suivante:
      </p>
      <Attempt>
        {tex`${ctx.data.expr} =`} {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
  children: (ctx) => {
    const factored = createMemo(() => ctx.inputs.attempt.isFactored())
    const equal = createMemo(() => ctx.inputs.attempt.isEqual(ctx.data.expr))
    return (
      <Switch>
        <Match when={ctx.correct}>Correct!</Match>
        <Match when={!factored()}>La tentative n'est pas complètement factorisée.</Match>
        <Match when={!equal()}>La tentative n'est pas équivalente à l'expression originale.</Match>
      </Switch>
    )
  },
})
