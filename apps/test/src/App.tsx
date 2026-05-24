import { Heading } from '@learning/components/Heading'
import { tex } from '@learning/components/Latex'
import { Page } from '@learning/components/Page'
import { $, encrypt, expr, Sequence } from '@learning/core'
import Factor from '@learning/exercises/math/factor'
import Simple from '@learning/exercises/math/simple'
import PythonCode from '@learning/exercises/python/code'
import { range, sample } from 'es-toolkit'
import './style.css'

export default () => (
  <Page>
    <Heading level={1}>CAS</Heading>
    <p>
      Pour l'écriture du feedback, il est important de pouvoir faire des calculs symboliques de
      manière lisible.
    </p>
    {tex.block`
      y = ${expr('(x - 2) (x - 3)^3').expand()}\\
      \int_0^1 x^2 \, \mathrm{d} x = ${expr('x^2').integrate('x', 0, 1)}
    `}
    <Heading level={2}>Séquence générée</Heading>
    <Sequence
      id="generated"
      exercise={Factor}
      next={() => {
        const x1 = sample([1, 2, 3, 4, 5, 6])
        const x2 = sample([1, 2, 3, 4, 5, 6])
        return { expr: expr(`(x - ${x1}) (x - ${x2})`).expand() }
      }}
    />
    <Heading level={2}>Séquence prédéterminée</Heading>
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
  </Page>
)
