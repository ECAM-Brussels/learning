import { Attempt, Code, Page } from '@learning/components'
import { expr, Step } from '@learning/core'
import { Factor } from '@learning/exercises/math/algebra/Factor'
import { PythonCode } from '@learning/exercises/python/Code'
import dedent from 'dedent'
import { sample } from 'es-toolkit'

export default () => (
  <Page title="Tests">
    <Code lang="python" run math>
      {dedent /* python */ `
        from sympy import *
        x = symbols("x")
        expand((x - 2) * (x - 3))
      `}
    </Code>
    <Factor
      id="test2"
      data={() => ({
        expr: expr('(x - a) (x - b)')
          .subs({ a: sample([1, 2, 3]), b: sample([1, 2, 3]) })
          .expand(),
      })}
    />
    <PythonCode
      prompt="Écris un programme qui affiche le carré d'un nombre."
      tests={[1, 2, 3].map((n) => ({
        test: `f(${n})`,
        check: (output) => output.result?.trim() === `${n ** 2}`,
      }))}
    />
    <Step
      id="standalone"
      schema={{ data: {}, inputs: { attempt: 'expr' } }}
      data={{}}
      correct={(ctx) => ctx.inputs.attempt.isEqual(4)}
      prompt={(ctx) => <Attempt>2 + 2 = {ctx.inputs.attempt}</Attempt>}
    >
      {(ctx) => <p>{JSON.stringify(ctx, null, 2)}</p>}
    </Step>
  </Page>
)
