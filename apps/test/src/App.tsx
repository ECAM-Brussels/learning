import Code from '@learning/components/Code'
import Latex from '@learning/components/Latex'
import { $, encrypt, ExerciseSequence, expr, Practice } from '@learning/core'
import Factor from '@learning/exercises/math/factor'
import Simple from '@learning/exercises/math/simple'
import dedent from 'dedent'
import { sample } from 'es-toolkit'
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
          <div class="prose">
            <h1>Bonjour</h1>
            <p>
              Que vaut <Latex value="\int_0^1 1 \, \mathrm{d} x" />?
            </p>
            <div class="flex items-center justify-center gap-4">
              <Latex value="\int_0^1 1 \, \mathrm{d} x =" displayMode />
              <Simple answer={$(() => encrypt('1'))} />
            </div>
          </div>
        </ExerciseSequence>
        <Practice
          exercise={Factor}
          next={async () => {
            const x1 = sample([1, 2, 3, 4, 5, 6])
            const x2 = sample([1, 2, 3, 4, 5, 6])
            return { expr: await expr(`(x - ${x1}) (x - ${x2})`).expand().latex() }
          }}
        />
      </div>
    </Loading>
  )
}
