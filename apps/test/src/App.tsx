import { Attempt, Page } from '@learning/components'
import { createStep, expr, tex } from '@learning/core'
import { allKeyed, sample } from 'es-toolkit'

const Factor = createStep({
  name: 'math/algebra/factor',
  schema: { data: { expr: 'expr' }, inputs: { attempt: 'expr' } },
  correct: async (ctx) => {
    const { equal, factored } = await allKeyed({
      equal: ctx.inputs.attempt.isEqual(ctx.data.expr),
      factored: ctx.inputs.attempt.isFactored(),
    })
    return equal && factored
  },
  prompt: (ctx) => (
    <>
      <p>Factorise l'expression suivante:</p>
      <Attempt>
        {tex`${ctx.data.expr} = `} {ctx.inputs.attempt}
      </Attempt>
    </>
  ),
})

export default () => (
  <Page title="Tests">
    <Factor
      id="test2"
      data={async () => ({
        expr: await expr('(x - a) (x - b)')
          .subs({ a: sample([1, 2, 3]), b: sample([1, 2, 3]) })
          .expand()
          .latex(),
      })}
    />
  </Page>
)
