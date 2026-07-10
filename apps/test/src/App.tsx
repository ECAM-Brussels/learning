import { Attempt, Code, Page } from '@learning/components'
import { Exercise, expr, Step, tex } from '@learning/core'
import { Factor } from '@learning/exercises/math/algebra/Factor'
import { PythonCode } from '@learning/exercises/python/Code'
import dedent from 'dedent'
import { allKeyed, sample } from 'es-toolkit'

export default () => (
  <Page title="Tests">
    <Exercise
      id="automatic-differentiation"
      schema={{ data: { expr: 'expr' }, inputs: { attempt: 'expr' } }}
      data={{ expr: tex.raw`(x + \epsilon)^2` }}
      correct={(ctx) => ctx.inputs.attempt.isEqual(ctx.data.expr)}
      prompt={(ctx) => (
        <>
          <p>Développez l'expression {tex`${ctx.data.expr}`}</p>
          <Attempt>
            {tex`${ctx.data.expr} =`}
            {ctx.inputs.attempt}
          </Attempt>
        </>
      )}
    >
      {(ctx) => (
        <>
          <p>
            Correct! Maintenant, imaginons que nous sommes dans un monde où {tex`\epsilon > 0`} mais{' '}
            {tex`\epsilon^2 = 0`}. Simplifiez votre expression en utilisant cette hypothèse.
          </p>
          <Exercise
            schema={{ data: { expr: 'expr' }, inputs: { attempt: 'expr' } }}
            data={ctx.data}
            correct={(ctx) => ctx.inputs.attempt.isEqual(ctx.data.expr.taylor('\\epsilon', 0, 1))}
            prompt={(ctx) => (
              <>
                <Attempt>
                  {tex`${ctx.data.expr} =`}
                  {ctx.inputs.attempt}
                </Attempt>
              </>
            )}
          >
            <p>
              L'hypothèse {tex`\epsilon^2 = 0`} nous a permis de calculer l'
              <strong>approximation linéaire</strong> de {tex`${ctx.data.expr}`} autour de{' '}
              {tex`\epsilon = 0`}:
            </p>
            {tex`
              \underbrace{${ctx.data.expr}}_{f(x + \epsilon)}
              = \underbrace{${ctx.data.expr.subs({ epsilon: 0 }).simplify()}}_{f(x)}
              + \underbrace{${ctx.data.expr.diff().subs({ epsilon: 0 }).simplify()}}_{f'(x)} \epsilon
            `}
            <p>
              On parle de <strong>dérivation automatique</strong>
            </p>
          </Exercise>
        </>
      )}
    </Exercise>
    <Code lang="python" run math>
      {dedent /* python */ `
        from sympy import *
        x = symbols("x")
        expand((x - 2) * (x - 3))
      `}
    </Code>
    <Factor
      id="test2"
      data={() =>
        allKeyed({
          expr: expr('(x - a) (x - b)')
            .subs({ a: sample([1, 2, 3]), b: sample([1, 2, 3]) })
            .expand()
            .latex(),
        })
      }
    >
      <Factor expr="x^2 - 4" />
    </Factor>
    <PythonCode
      prompt="Écris un programme qui affiche le carré d'un nombre."
      tests={[1, 2, 3].map((n) => ({
        test: `f(${n})`,
        check: (output) => output.result === `${n ** 2}`,
      }))}
      check={() => true}
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
