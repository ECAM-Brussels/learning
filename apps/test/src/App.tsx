import { Example, Remark } from '@learning/components/Environment'
import { Heading } from '@learning/components/Heading'
import { hl } from '@learning/components/Highlight'
import { Page } from '@learning/components/Page'
import { $, encrypt, expr, Generate, Sequence, tex } from '@learning/core'
import Exercise from '@learning/exercises/math/Exercise'
import Factor from '@learning/exercises/math/factor'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import PythonCode from '@learning/exercises/python/code'
import { range, sample } from 'es-toolkit'
import './style.css'

export default () => (
  <Page>
    <Heading level={1}>Exemples</Heading>
    <Heading level={2}>Avec réponse préencodée</Heading>
    <p>
      Tout d'abord, commençons par l'exemple le plus simple possible: un exercice avec{' '}
      <strong>réponse préencodée</strong>. Voici l'exercice que nous allons tenter de répliquer:
    </p>
    <Example title="Exercice avec réponse préencodée">
      <Exercise id="simple" grade={(props) => props.attempt.isEqual('2')}>
        {(props) => (
          <p>
            Que vaut {tex`1 + 1`} ? {props.attempt}
          </p>
        )}
      </Exercise>
    </Example>
    <p>Le code permettant d'afficher la question est relativement simple</p>
    {hl('tsx') /* tsx */ `
      <Exercise /* (plus tard...) */>
        <p>Que vaut {tex\`1 + 1\`} ?</p>
      </Exercise>
    `}
    <p>
      Le problème du code ci-dessus est qu'il n'affiche pas le champ de saisie. Pour l'afficher, il
      faut procéder comme suit:
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise /* (plus tard...) */>
        {(props) => <p>Que vaut {tex\`1 + 1\`} ? {props.attempt}</p>}
      </Exercise>
    `}
    <p>
      Dans le code ci-dessus, le corps d'<code>Exercise</code> est une <strong>fonction</strong>.
      Cette fonction reçoit en argument des propriétés utiles pour construire la question, comme{' '}
      <code>props.attempt</code>, qui contient le champ de saisie de l'exercice.
    </p>
    <Remark>
      <p>
        Notons qu'il est possible de renommer le champ <code>props.attempt</code> si nécéssaire, en
        spécifiant le paramètre <code>inputs</code> de l'exercice. Dans l'exemple ci-dessous, nous
        appelerons le champ de saisie <code>result</code>.
      </p>
      {hl('tsx') /* tsx */ `
        <Exercise inputs={['result']} /* (plus tard...) */>
          {(props) => <p>Que vaut {tex\`1 + 1\`} ? {props.result}</p>}
        </Exercise>
      `}
      <p>
        Ceci sera particulièrement utile plus tard pour les exercices avec plusieurs champs de
        saisie.
      </p>
    </Remark>
    <p>
      Il reste maintenant à voir comment <strong>corriger</strong> l'exercice. Ceci se fait en
      spécifant la propriété <code>grade</code> de <code>Exercise</code>. Dans notre cas, on
      souhaite vérifier que la tentative est égale à {tex`2`}.
    </p>
    {hl('tsx') /* tsx */ `
      <Exercise grade={(props) => props.attempt.isEqual('1 + 1')}>
        {(props) => <p>Que vaut {tex\`1 + 1\`} ? {props.attempt}</p>}
      </Exercise>
    `}
    <Heading level={2}>Feedback</Heading>
    <Heading level={2}>Avec des paramètres aléatoires</Heading>
    <p>Et si je voulais faire varier des paramètres pour créer des exercices différents ?</p>
    <Example title="Exemple avec paramètres variables">
      <Exercise
        id="with-params"
        inputs={['c']}
        params={() => ({ a: sample([1, 2, 3]), b: sample([1, 2, 3]) })}
        grade={(props) => expr('a + b = c').subs(props).isTrue()}
      >
        {(props) => (
          <p>
            Que vaut {tex`${props.a} + ${props.b}`} ? {props.c}
          </p>
        )}
      </Exercise>
    </Example>
    <Heading level={1}>CAS</Heading>
    <MultipleChoice
      id="mcq-integrale"
      choices={{
        a: tex`${expr('x').integrate('x', 0, 1)}`,
        b: tex`${expr('x').delta('x', 0, 1)}`,
        c: tex`${expr('x^2').integrate('x', 0, 1)}`,
      }}
      answer={$(() => encrypt('a'))}
    >
      <p>
        Que vaut l'intégrale de {tex`x`} entre {tex`0`} et {tex`1`} ?
      </p>
    </MultipleChoice>
    <p>
      Pour l'écriture du feedback, il est important de pouvoir faire des calculs symboliques de
      manière lisible.
    </p>
    {tex`
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
              {tex`
                \int_0^1 1 \, \mathrm{d} x =
              `}
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
          {tex`
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
