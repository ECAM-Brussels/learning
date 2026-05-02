import Code from '@learning/components/Code'
import { ExerciseSequence } from '@learning/core'
import Factor from '@learning/exercises/math/factor'
import Simple from '@learning/exercises/math/simple'
import dedent from 'dedent'
import { Loading } from 'solid-js'
import './style.css'

export default () => (
  <Loading>
    <div class="container mx-auto">
      <Code lang="python" run math>
        {dedent /* python */ `
          from sympy import *
          x = Symbol("x")
          expr = (x + 1) * (x - 2) * (x + 4)
          expand(expr)
        `}
      </Code>
      <ExerciseSequence>
        <Factor question={{ expr: '(x + {a})(x + {b})' }} params={{ a: [1, 2, 3], b: [1, 2, 3] }} />
        <Simple
          question={{
            label: 'Réponse:',
            answer: String.raw`34`,
          }}
        />
      </ExerciseSequence>
    </div>
  </Loading>
)
