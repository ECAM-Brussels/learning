import { Heading } from '@learning/components/Heading'
import { tex } from '@learning/components/Latex'
import { Page } from '@learning/components/Page'
import { $, expr, Sequence } from '@learning/core'
import Factor from '@learning/exercises/math/factor'
import MultipleFields from '@learning/exercises/math/MultipleFields'
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
      <Factor expr={$(() => expr('(x + 2) (x + 3)').expand())} />
      <Factor expr="x^2 - 1" />
      <div>
        <h3>Bonjour</h3>
        <p>Que vaut {tex`\int_0^1 1 \, \mathrm{d} x`}?</p>
        <div class="flex items-center justify-center gap-4">
          {tex.block`\int_0^1 1 \, \mathrm{d} x =`}
          <Simple grade={(attempt) => attempt.isEqual('1')} />
        </div>
      </div>
      <Simple grade={(attempt) => attempt.isEqual(`\\pi`)} />
      <div>
        <h3>Exercice de Python</h3>
        <p>Écrivez la fonction {tex`f(x) = x^2`} en Python</p>
        <PythonCode tests={range(4, 7).map((i) => ({ test: `f(${i})`, result: `${i ** 2}` }))} />
      </div>
    </Sequence>
    <Simple
      params={() => ({ x: sample([1, 2, 3]) })}
      grade={(attempt, { x }) => attempt.isEqual(`(${x})^2`)}
    >
      {(params) => <p>Calcule {tex`${params.x}`} au carré</p>}
    </Simple>
    <MultipleFields
      id="multiple-fields"
      params={() => ({ t: sample([12, 24, 36]) })}
      fields={['a', 'b']}
      grade={({ a, b, t }) => expr(`a b = t`).subs({ a, b, t }).isTrue()}
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
    </MultipleFields>
    <MultipleFields
      id="test"
      fields={['t', 'v']}
      grade={({ t, v }) => expr('v = a t').subs({ a: 9.81, t, v }).isTrue()}
    >
      {(props) => (
        <p>
          Après {tex`t =`} {props.t} secondes de chute libre, la vitesse est {tex`v =`} {props.v}{' '}
          mètres par seconde.
        </p>
      )}
    </MultipleFields>
  </Page>
)
