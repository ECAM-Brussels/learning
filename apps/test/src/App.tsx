import Code from '@learning/components/Code'
import { Example } from '@learning/components/Environment'
import { tex } from '@learning/components/Latex'
import Slide from '@learning/components/Slide'
import Slideshow from '@learning/components/Slideshow'
import { $, encrypt, ExerciseSequence, expr, Practice } from '@learning/core'
import Factor from '@learning/exercises/math/factor'
import Simple from '@learning/exercises/math/simple'
import dedent from 'dedent'
import { sample } from 'es-toolkit'
import { Loading } from 'solid-js'
import './style.css'

export default () => (
  <Loading>
    <main class="prose container mx-auto">
      <h1>Séquence prédéterminée</h1>
      <ExerciseSequence>
        <Factor expr={$(() => expr('(x + 2) (x + 1)').expand().latex())} />
        <Factor expr="x^2 - 1" />
        <div>
          <h3>Bonjour</h3>
          <p>Que vaut {tex`\int_0^1 x^2 \, \mathrm{d} x`}?</p>
          <div class="flex items-center justify-center gap-4">
            {tex.block`\int_0^1 1 \, \mathrm{d} x =`}
            <Simple answer={$(() => encrypt('1'))} />
          </div>
        </div>
      </ExerciseSequence>
      <h1>Séquence générée</h1>
      <Practice
        exercise={Factor}
        next={async () => {
          const x1 = sample([1, 2, 3, 4, 5, 6])
          const x2 = sample([1, 2, 3, 4, 5, 6])
          return { expr: await expr(`(x - ${x1}) (x - ${x2})`).expand().latex() }
        }}
      />
    </main>
    <Slideshow>
      <Slide title="Calcul numérique">
        <p>
          L'objectif de cette session est la découverte du langage de programmation <em>Python</em>.
        </p>
        {tex.block`\int_0^1 x^2 \, \mathrm{d} x = \frac 1 3`}
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
        <Example>
          <p>Selon Python, que vaut {tex`0.1 \times 0.1`}</p>
          <div class="flex items-center justify-end gap-4">
            Votre réponse:
            <Simple id="test" answer={$(() => encrypt(`${0.1 * 0.1}`))} />
          </div>
        </Example>
      </Slide>
      <Slide title="Fonctions">
        <p>Définis une fonction {tex`f(x) = x^2`} en Python</p>
      </Slide>
    </Slideshow>
  </Loading>
)
