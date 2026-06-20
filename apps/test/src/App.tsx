import { Attempt, Page } from '@learning/components'
import { Exercise, expr, Step, tex } from '@learning/core'
import { Factor } from '@learning/exercises/math/algebra/Factor'
import { PythonExercise } from '@learning/exercises/python/code'
import { sample } from 'es-toolkit'

export default () => (
  <Page title="Tests">
    <Exercise id="generate" data={() => ({ a: sample([1, 2, 3]), b: sample([1, 2, 3]) })}>
      {(data) => (
        <Step
          inputs={{ c: 'expr' }}
          feedback={(inputs) => ({
            correct: expr('a + b = c')
              .subs({ ...data, ...inputs })
              .isTrue(),
          })}
          prompt={(ctx) => (
            <Attempt correct={() => ctx.feedback?.correct}>
              {tex`${expr('a + b').subs(data)} = `} {ctx.inputs.c}
            </Attempt>
          )}
        />
      )}
    </Exercise>
    <Factor id="app-test" expr="x^2 - 4" />
    <PythonExercise
      id="python-test"
      prompt={
        <p>
          Écrivez une fonction {tex`f`} qui prend un entier {tex`n`} et retourne {tex`n^2`}
        </p>
      }
      tests={[1, 2, 3, 4].map((n) => ({ test: `f(${n})`, expected: `${n ** 2}` }))}
    />
  </Page>
)
