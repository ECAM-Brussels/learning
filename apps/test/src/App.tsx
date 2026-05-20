import { tex } from '@learning/components/Latex'
import Slide from '@learning/components/Slide'
import Slideshow from '@learning/components/Slideshow'
import { $, encrypt, expr, Sequence } from '@learning/core'
import Factor from '@learning/exercises/math/factor'
import Simple from '@learning/exercises/math/simple'
import PythonCode from '@learning/exercises/python/code'
import { range, sample } from 'es-toolkit'
import { Loading } from 'solid-js'
import './style.css'

export default () => (
  <Loading>
    <main class="prose container mx-auto">
      <h1>CAS</h1>
      <p>
        Pour l'écriture du feedback, il est important de pouvoir faire des calculs symboliques de
        manière lisible.
      </p>
      {tex.block`
        y = ${expr('(x - 2) (x - 3)^3').expand()}\\
        \int_0^1 x^2 \, \mathrm{d} x = ${expr('x^2').integrate('x', 0, 1)}
      `}
      <h1>Séquence générée</h1>
      <Sequence
        id="generated"
        exercise={Factor}
        next={async () => {
          const x1 = sample([1, 2, 3, 4, 5, 6])
          const x2 = sample([1, 2, 3, 4, 5, 6])
          return { expr: await expr(`(x - ${x1}) (x - ${x2})`).expand().latex() }
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
      <Slide title="Fonctions">
        <Factor id="x^2 - 1" expr="x^2 - 1" />
        <p>Définis une fonction {tex`f(x) = x^2`} en Python</p>
        <PythonCode
          id="x-squared"
          tests={range(4, 7).map((i) => ({ test: `f(${i})`, result: `${i ** 2}` }))}
        />
      </Slide>
    </Slideshow>
  </Loading>
)
