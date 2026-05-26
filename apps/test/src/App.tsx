import { Heading } from '@learning/components/Heading'
import { tex } from '@learning/components/Latex'
import { Page } from '@learning/components/Page'
import { $, expr, Generate, Sequence } from '@learning/core'
import Exercise from '@learning/exercises/math/Exercise'
import Factor from '@learning/exercises/math/factor'
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
    <Generate
      exercise={Factor}
      data={() => ({
        expr: expr('(x - a) (x - b)')
          .subs({ a: sample([1, 2, 3]), b: 0 })
          .expand(),
      })}
    />
    <Heading level={2}>Séquence générée</Heading>
    <Sequence
      id="generated"
      exercise={Factor}
      next={() => ({
        expr: expr(`(x - x_1) (x - x_2)`)
          .subs({ x_1: sample([1, 2, 3, 4, 5]), x_2: sample([1, 2, 3, 4, 5]) })
          .expand(),
      })}
    />
    <Heading level={2}>Séquence prédéterminée</Heading>
    <Sequence id="predefined">
      <Factor expr={$(() => expr('(x + 2) (x + 3)').expand())} />
      <Factor expr="x^2 - 1" />
      <Exercise grade={({ attempt }) => attempt.isEqual('1')}>
        {(props) => (
          <>
            <p>Que vaut {tex`\int_0^1 1 \, \mathrm{d} x`}?</p>
            <div class="flex items-center justify-center gap-4">
              {tex.block`\int_0^1 1 \, \mathrm{d} x =`}
              {props.attempt}
            </div>
          </>
        )}
      </Exercise>
      <div>
        <h3>Exercice de Python</h3>
        <p>Écrivez la fonction {tex`f(x) = x^2`} en Python</p>
        <PythonCode tests={range(4, 7).map((i) => ({ test: `f(${i})`, result: `${i ** 2}` }))} />
      </div>
    </Sequence>
    <Exercise
      id="square"
      params={() => ({ x: sample([1, 2, 3]) })}
      grade={({ x, attempt }) => attempt.isEqual(`(${x})^2`)}
    >
      {(props) => (
        <p>
          Calcule {tex`${props.x}`} au carré: {props.attempt}
        </p>
      )}
    </Exercise>
    <Exercise
      id="multiple-fields"
      params={() => ({ t: sample([12, 24, 36]) })}
      inputs={['a', 'b']}
      grade={({ a, b, t }) => expr(`a b = t`).subs({ a, b, t }).isTrue()}
      feedback={(props) => (
        <p>
          {tex`${props.a} \times ${props.b}`} vaut {tex`${expr('a b').subs(props)}`}, ce qui n'est
          pas égal à {tex`${props.t}`}
        </p>
      )}
    >
      {(props) => (
        <>
          <p>
            Trouvez deux nombres {tex`a`} et {tex`b`} dont le produit vaut {tex`${props.t}`}.
          </p>
          <div class="flex gap-16">
            <div class="flex items-center justify-center gap-4">
              {tex`a = `}
              {props.a}
            </div>
            <div class="flex items-center justify-center gap-4">
              {tex`b = `}
              {props.b}
            </div>
          </div>
        </>
      )}
    </Exercise>
    <Exercise
      id="test"
      params={() => ({ t: sample([1, 2, 3, 4, 5]) })}
      inputs={['v']}
      grade={({ t, v }) => expr('v = a t').subs({ a: 9.81, t, v }).isTrue()}
      feedback={(props) => (
        <>
          <p>La vitesse se calcule avec la formule</p>
          {tex.block`
            v = a \cdot t
              = 9.81 \cdot ${props.t}
              = ${expr('a t').subs({ a: 9.81, t: props.t }).N()}
          `}
        </>
      )}
    >
      {(props) => (
        <p>
          Après {tex`t = ${props.t}`} secondes de chute libre, la vitesse est {tex`v =`} {props.v}{' '}
          mètres par seconde.
        </p>
      )}
    </Exercise>
  </Page>
)
