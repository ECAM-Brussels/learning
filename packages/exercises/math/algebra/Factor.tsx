import { Attempt } from '@learning/components'
import { createStep, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { Match, Switch } from 'solid-js'
import { Root } from './Root'

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
  children: (factor) => (
    <Switch>
      <Match when={factor.correct}>{factor.next}</Match>
      <Match when={!factor.correct}>
        <Root
          expr={factor.data.expr}
          next={<Factor expr={factor.data.expr} next={factor.next} />}
        />
      </Match>
    </Switch>
  ),
})
