import Code from '@learning/components/Code'
import Exercise from '@learning/exercises'
import dedent from 'dedent'
import { createSignal, Loading } from 'solid-js'
import './style.css'

const [exercise, setExercise] = createSignal({
  name: 'math/factor' as const,
  question: { expr: '(x + {a})(x + {b})' },
  params: {
    a: [1, 2, 3],
    b: [1, 2, 3],
  },
  attempt: [],
})

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
      <Exercise fetch={exercise} save={setExercise} />
    </div>
  </Loading>
)
