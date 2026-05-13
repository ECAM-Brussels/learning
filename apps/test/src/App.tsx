import Code from '@learning/components/Code'
import Latex from '@learning/components/Latex'
import Slide from '@learning/components/Slide'
import { $, encrypt, ExerciseSequence, expr, Practice } from '@learning/core'
import Factor from '@learning/exercises/math/factor'
import Simple from '@learning/exercises/math/simple'
import Python from '@learning/exercises/python/code'
import dedent from 'dedent'
import { sample } from 'es-toolkit'
import { Loading } from 'solid-js'
import './style.css'

export default function App() {
  return (
    <Loading>
      <Slide title="Calcul numérique">
        <p>
          L'objectif de cette session est la découverte du langage de programmation <em>Python</em>.
        </p>
        <p>
          Cette page est <strong>interactive</strong>. N'hésitez pas à modifier les codes
          ci-dessous, et le résultat changera.
        </p>
      </Slide>
      <Slide title="Opérations arithmétiques">
        <Code lang="python" run math>
          {dedent /* python */ `
            3 * 4
          `}
        </Code>
        <div class="rounded-xl border border-slate-500 bg-slate-50 p-2">
          <p>
            Selon Python, que vaut <Latex value="0.1 \times 0.1" />?
          </p>
          <div class="flex items-center justify-end gap-4">
            Votre réponse:
            <Simple answer={$(() => encrypt(`${0.1 * 0.1}`))} />
          </div>
        </div>
      </Slide>
      <Slide title="Fonctions">
        <p>
          Définis une fonction <Latex value="f(x) = x^2" /> en Python
        </p>
        <Python
          id="x-squared"
          tests={[
            { test: 'f(0)', result: '0' },
            { test: 'f(1)', result: '1' },
            { test: 'f(2)', result: '4' },
            { test: 'f(-1)', result: '1' },
          ]}
        />
      </Slide>
      <main class="container mx-auto">
        <ExerciseSequence>
          <Factor expr={$(() => expr('(x + 2) (x + 1)').expand().latex())} />
          <Factor expr="x^2 - 1" />
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
      </main>
    </Loading>
  )
}
