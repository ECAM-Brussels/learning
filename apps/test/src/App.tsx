import Code from '@learning/components/Code'
import Latex from '@learning/components/Latex'
import { $, encrypt, ExerciseSequence, expr } from '@learning/core'
import Factor from '@learning/exercises/math/factor'
import Simple from '@learning/exercises/math/simple'
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
          <>
            <p>
              Que vaut <Latex value="\int_0^1 1 \, \mathrm{d} x" />?
            </p>
            <Simple encryptedAnswer={$(() => encrypt('1'))} label="Réponse:" />
          </>
        </ExerciseSequence>
      </div>
    </Loading>
  )
}
