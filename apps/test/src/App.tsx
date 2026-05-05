import Code from '@learning/components/Code'
import { $, ExerciseSequence, expr } from '@learning/core'
import Factor from '@learning/exercises/math/factor'
import dedent from 'dedent'
import { Loading } from 'solid-js'
import './style.css'

export default function App() {
  return (
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
          <Factor expr={$(() => expr('(x + 2) (x + 1)').expand().latex())} />
          <Factor expr={'x^2 - 1'} />
        </ExerciseSequence>
      </div>
    </Loading>
  )
}
