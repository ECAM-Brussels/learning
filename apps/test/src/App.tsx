import Code from '@learning/components/Code'
import { Example } from '@learning/components/Environment'
import { tex } from '@learning/components/Latex'
import Slide from '@learning/components/Slide'
import Slideshow from '@learning/components/Slideshow'
import { $, encrypt, expr, Sequence } from '@learning/core'
import Factor from '@learning/exercises/math/factor'
import Simple from '@learning/exercises/math/simple'
import PythonCode from '@learning/exercises/python/code'
import dedent from 'dedent'
import { range, sample } from 'es-toolkit'
import { createMemo, Loading } from 'solid-js'
import './style.css'

export default () => (
  <Loading>
    <main class="prose container mx-auto">
      <h1>Séquence générée</h1>
      <Sequence
        id="generated"
        next={() => {
          const x1 = sample([1, 2, 3, 4, 5, 6])
          const x2 = sample([1, 2, 3, 4, 5, 6])
          const exercise = createMemo(() => expr(`(x - ${x1}) (x - ${x2})`).expand().latex())
          return <Factor expr={exercise()} />
        }}
      />
      <h1>Séquence prédéterminée</h1>
      <Sequence id="predefined">
        <Factor expr={$(() => expr('(x + 2) (x + 1)').expand().latex())} />
        <Factor expr="x^2 - 1" />
        <div>
          <h3>Bonjour</h3>
          <p>Que vaut {tex`\int_0^1 1 \, \mathrm{d} x`}?</p>
          <div class="flex items-center justify-center gap-4">
            {tex.block`\int_0^1 1 \, \mathrm{d} x =`}
            <Simple answer={$(() => encrypt('1'))} />
          </div>
        </div>
        <div>
          <h3>Exercice de Python</h3>
          <p>Écrivez la fonction {tex`f(x) = x^2`} en Python</p>
          <PythonCode tests={range(4, 7).map((i) => ({ test: `f(${i})`, result: `${i ** 2}` }))} />
        </div>
      </Sequence>
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
