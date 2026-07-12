import { Attempt } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { allKeyed } from 'es-toolkit'
import { Match, Show, Switch } from 'solid-js'
import { Root } from './Root'

export const Factor = createStep({
  name: 'math/algebra/factor',
  schema: {
    data: { expr: 'expr' },
    inputs: { attempt: 'expr' },
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
  async grade(ctx) {
    const { equal, factored, ...data } = await allKeyed({
      equal: ctx.inputs.attempt.isEqual(ctx.data.expr),
      squaredSum: ctx.inputs.attempt.matches('(a + b)^2'),
      factored: ctx.inputs.attempt.isFactored(),
    })
    return [equal && factored, { equal, factored, ...data }]
  },
  feedback: (ctx) => (
    <Switch>
      <Match when={!ctx.correct}>
        <Root expr={ctx.data.expr}>
          {(rootCtx) => (
            <FactorFromRoot root={rootCtx.inputs.root}>
              <ctx.Self />
            </FactorFromRoot>
          )}
        </Root>
      </Match>
    </Switch>
  ),
})

const FactorFromRoot = createStep({
  name: 'math/algebra/factor-from-root',
  schema: {
    data: { root: 'expr' },
    inputs: { factor: 'expr' },
  },
  grade: (ctx) => ctx.inputs.factor.isEqual(expr(`x - a`).subs({ a: ctx.data.root })),
  prompt: (ctx) => (
    <>
      <p>
        Quel facteur est associé à la racine <strong>{tex`${ctx.data.root}`}</strong> ?
      </p>
      <Attempt>
        {tex`y =`} {ctx.inputs.factor}
      </Attempt>
    </>
  ),
  feedback: (ctx) => (
    <Show when={!ctx.correct}>
      <p>
        N'oubliez pas que le facteur {tex`${ctx.inputs.factor}`} doit également avoir comme racine{' '}
        {tex`${ctx.data.root}`}. Cependant, dans ce cas-ci, on a
      </p>
      {tex`
        ${ctx.inputs.factor}
        = ${ctx.inputs.factor.subs({ x: ctx.data.root })}
        = ${ctx.inputs.factor.subs({ x: ctx.data.root }).simplify()}
      `}
      <ctx.Self />
    </Show>
  ),
})
