import { CheckMark, Code } from '@learning/components'
import { Sequence, tex } from '@learning/core'
import { Simple } from '@learning/exercises/math/Simple'
import { DifferentialQuotient } from '@learning/exercises/numerical/DifferentialQuotient'
import { PythonFunction } from '@learning/exercises/python/Function'
import { Matplotlib } from '@learning/exercises/python/Matplotlib'
import { dedent } from 'es-toolkit/string'

export function Slope() {
  return (
    <PythonFunction
      id="slope"
      fnName="pente"
      prompt={
        <>
          <p>
            Définissez une fonction <code>pente</code> qui prend deux listes en argument
            représentant deux points dans le plan et qui retourne la pente de la droite passant par
            ces deux points.
          </p>
          <p>
            Vous pouvez appeler la fonction pour la tester, par exemple{' '}
            <code>pente([1, 2], [3, 4])</code> devrait retourner <code>1</code>.
          </p>
          <p class="text-sm italic">
            Remarque: cette exercice comporte deux parties. La deuxième apparaîtra après complétion
            de la première.
          </p>
        </>
      }
      tests={[
        { input: ['[1, 2]', '[3, 4]'], correct: (output) => output === '1' },
        { input: ['[0, 0]', '[1, 4]'], correct: (output) => output === '4' },
        { input: ['[0, 0]', '[1, -3]'], correct: (output) => output === '-3' },
        { input: ['[-2, 8]', '[-1, 5]'], correct: (output) => output === '-3' },
      ]}
    >
      {(ctx) => (
        <>
          <p></p>
          <p>
            Votre fonction est correcte! <CheckMark value={true} /> Cependant, regardons ce qui se
            passe lorsque nous utilisons votre code avec deux points dont les ordonnées sont
            proches, tels que {tex`(1, 1)`} et {tex`(1 + 10^{-15}, 1 + 10^{-16})`}.
          </p>
          <Code
            lang="python"
            run
            highlight={[-1]}
            children={
              ctx.inputs.code +
              '\n\n' +
              dedent /* python */ `
                pente([1, 1], [1 + 1e-15, 1 + 1e-16])
              `
            }
          />
          <Simple
            prompt={
              <p>
                Quel aurait dû être la réponse? Calculez la <strong>pente réelle</strong>.
              </p>
            }
            grade={(attempt) => attempt.isEqual(`\\frac{1}{10}`)}
          >
            <p>
              Ceci est dû au fait que Python utilise environ {tex`15`} chiffres significatifs, et
              donc
            </p>
            {tex`
              \Delta y = \overbrace{(1 + 10^{-16})}^{\approx 1 \ \text{(15 ch. sig.)}} - 1 \approx 0
            `}
          </Simple>
        </>
      )}
    </PythonFunction>
  )
}

export function Secant() {
  return (
    <Sequence id="secant">
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de la droite ayant pour pente {tex`-2`} et passant par le point{' '}
            {tex`(-3, -4)`}. Nommez les axes.
          </p>
        }
        tests={[
          { type: 'plot', x: [-5, 5], y: '-2 * (x + 3) - 4' },
          { type: 'axisLabels', x: /x/, y: /y/ },
        ]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = \sin x`} sur {tex`[-\pi, \pi]`}, ainsi que de la droite
            qui croise le graphe en {tex`x = -2`} et {tex`x = 2`}. Nommez les axes.
          </p>
        }
        tests={[
          { type: 'plot', x: [-Math.PI, Math.PI], y: 'np.sin(x)' },
          {
            type: 'plot',
            x: [-Math.PI, Math.PI],
            y: 'np.sin(-2) + (np.sin(2) - np.sin(-2)) / 4 * (x - (-2))',
          },
          { type: 'axisLabels', x: /x/, y: /y/ },
        ]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = e^x`} sur {tex`[-1, 1]`}, ainsi que de la droite qui
            croise le graphe en {tex`x = 0`} et {tex`x = 0.01`}. Nommez les axes.
          </p>
        }
        tests={[
          { type: 'plot', x: [-1, 1], y: 'np.exp(x)' },
          {
            type: 'plot',
            x: [-1, 1],
            y: '1 + (np.exp(0.01) - 1) / 0.01 * x',
          },
          { type: 'axisLabels', x: /x/, y: /y/ },
        ]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = \cos x`} sur {tex`[-1, 3]`}. Nommez les axes. Ensuite,
            tracez les séquentes qui passent par {tex`a = 0.25`} et {tex`b = 0.25 + h`} pour{' '}
            {tex`h = 1`} et {tex`h = 0.1`}.
          </p>
        }
        tests={[
          { type: 'axisLabels', x: /x/, y: /y/ },
          { type: 'plot', x: [-1, 3], y: 'np.cos(x)' },
          {
            type: 'plot',
            x: [-1, 3],
            y: 'np.cos(0.25) + (np.cos(1.25) - np.cos(0.25)) / 1 * (x - 0.25)',
          },
          {
            type: 'plot',
            x: [-1, 3],
            y: 'np.cos(0.25) + (np.cos(0.35) - np.cos(0.25)) / 0.1 * (x - 0.25)',
          },
        ]}
      />
    </Sequence>
  )
}

export function Differences() {
  return (
    <Sequence id="differential-quotients">
      <DifferentialQuotient f="x^2" x="1" h="0.1" />
      <DifferentialQuotient f="x^2" x="1" h="10^{-6}" />
      <DifferentialQuotient f="\sin x" x="0" h="10^{-20}" />
      <DifferentialQuotient f="\exponentialE^{-x}" x="1" h="10^{-8}" />
    </Sequence>
  )
}

export function Tangents() {
  return (
    <Sequence id="tangents">
      <Matplotlib
        prompt={
          <>
            <p>Sur l'intervalle {tex`[0.5, 1.5]`}, tracez le graphe des fonctions suivantes:</p>
            <ul class="my-2 list-inside list-disc px-2">
              <li>{tex`f(x) = \sin x`}</li>
              <li>
                la vraie tangente de {tex`f`} en {tex`x = 1`}
              </li>
              <li>
                L'approximation de la tangente de {tex`f`} en {tex`x = 1`} obtenue par le{' '}
                <em>quotient différentiel central</em> de pas {tex`h = 0.5`}.
              </li>
              <li>
                L'approximation de la tangente de {tex`f`} en {tex`x = 1`} obtenue par le{' '}
                <em>quotient différentiel avant</em> de pas {tex`h = 0.5`}.
              </li>
            </ul>
            <p>Nommez les axes.</p>
          </>
        }
        tests={[
          { type: 'plot', x: [0.5, 1.5], y: 'np.sin(x)' },
          { type: 'plot', x: [0.5, 1.5], y: 'np.cos(1) * (x - 1) + np.sin(1)' },
          {
            type: 'plot',
            x: [0.5, 1.5],
            y: '(np.sin(1 + 0.5) - np.sin(1 - 0.5)) / (2 * 0.5) * (x - 1) + np.sin(1)',
          },
          {
            type: 'plot',
            x: [0.5, 1.5],
            y: '(np.sin(1 + 0.5) - np.sin(1)) / (0.5) * (x - 1) + np.sin(1)',
          },
          { type: 'axisLabels', x: /x/, y: /y/ },
        ]}
      >
        <p>Comme vous le constatez, sur cet exemple, la différence centrale est plus précise.</p>
      </Matplotlib>
      <Matplotlib
        prompt={
          <>
            <p>Sur l'intervalle {tex`[-0.5, 0.5]`}, tracez le graphe des fonctions suivantes:</p>
            <ul class="my-2 list-inside list-disc px-2">
              <li>{tex`f(x) = e^x`}</li>
              <li>
                la vraie tangente de {tex`f`} en {tex`x = 0`}
              </li>
              <li>
                L'approximation de la tangente de {tex`f`} en {tex`x = 0`} obtenue par le{' '}
                <em>quotient différentiel central</em> de pas {tex`h = 0.5`}.
              </li>
              <li>
                L'approximation de la tangente de {tex`f`} en {tex`x = 0`} obtenue par le{' '}
                <em>quotient différentiel arrière</em> de pas {tex`h = 0.5`}.
              </li>
            </ul>
            <p>Nommez les axes.</p>
          </>
        }
        tests={[
          { type: 'plot', x: [-0.5, 0.5], y: 'np.exp(x)' },
          { type: 'plot', x: [-0.5, 0.5], y: 'np.exp(0) * (x - 0) + np.exp(0)' },
          {
            type: 'plot',
            x: [-0.5, 0.5],
            y: '(np.exp(0 + 0.5) - np.exp(0 - 0.5)) / (2 * 0.5) * (x - 0) + np.exp(0)',
          },
          {
            type: 'plot',
            x: [-0.5, 0.5],
            y: '(np.exp(0 + 0.5) - np.exp(0)) / (0.5) * (x - 0) + np.exp(0)',
          },
          { type: 'axisLabels', x: /x/, y: /y/ },
        ]}
      >
        <p>Comme vous le constatez, sur cet exemple, la différence centrale est plus précise.</p>
      </Matplotlib>
    </Sequence>
  )
}

export function Derivatives() {
  return (
    <Sequence id="derivatives">
      <Matplotlib
        prompt={
          <>
            <p>Sur l'intervalle {tex`[-1, 1]`}, tracez les courbes suivantes:</p>
            <ul class="my-2 list-inside list-disc px-2">
              <li>{tex`f(x) = e^x`}</li>
              <li>
                Une approximation de la dérivée de {tex`f`} utilisant le quotient différentiel{' '}
                <strong>central</strong> de pas {tex`h = 0.5`}
              </li>
              <li>
                Une approximation de la dérivée de {tex`f`} utilisant le quotient différentiel{' '}
                <strong>avant</strong> de pas {tex`h = 0.5`}
              </li>
            </ul>
            <p>Nommez les axes.</p>
          </>
        }
        tests={[
          { type: 'plot', x: [-1, 1], y: 'np.exp(x)' },
          {
            type: 'plot',
            x: [-1, 1],
            y: '(np.exp(x + 0.5) - np.exp(x - 0.5)) / (2 * 0.5)',
          },
          {
            type: 'plot',
            x: [-1, 1],
            y: '(np.exp(x + 0.5) - np.exp(x)) / (0.5)',
          },
          { type: 'axisLabels', x: /x/, y: /y/ },
        ]}
      />
      <Matplotlib
        prompt={
          <>
            <p>Sur l'intervalle {tex`[-1, 1]`}, tracez les courbes suivantes:</p>
            <ul class="my-2 list-inside list-disc px-2">
              <li>
                la <strong>dérivée</strong> de {tex`f(x) = e^{-x^2}`}
              </li>
              <li>
                Une approximation de la dérivée de {tex`f`} utilisant le quotient différentiel{' '}
                <strong>central</strong> de pas {tex`h = 10^{-6}`}
              </li>
              <li>
                Une approximation de la dérivée de {tex`f`} utilisant le quotient différentiel{' '}
                <strong>central</strong> de pas {tex`h = 10^{-20}`}
              </li>
            </ul>
            <p>Nommez les axes.</p>
          </>
        }
        tests={[
          { type: 'plot', x: [-1, 1], y: '-2*x*np.exp(-x**2)' },
          {
            type: 'plot',
            x: [-1, 1],
            y: '(np.exp(-(x + 1e-6)**2) - np.exp(-(x - 1e-6)**2)) / (2 * 1e-6)',
          },
          {
            type: 'plot',
            x: [-1, 1],
            y: '(np.exp(-(x + 1e-20)**2) - np.exp(-(x - 1e-20)**2)) / (2 * 1e-20)',
          },
          { type: 'axisLabels', x: /x/, y: /y/ },
        ]}
      />
    </Sequence>
  )
}

export function SecondDerivatives() {
  return (
    <Sequence id="second-derivatives">
      <Matplotlib
        prompt={
          <>
            <p>Sur l'intervalle {tex`[-1, 1]`}, tracez les courbes suivantes:</p>
            <ul class="my-2 list-inside list-disc px-2">
              <li>
                la <strong>dérivée seconde</strong> de {tex`f(x) = \sin x`}
              </li>
              <li>
                Une approximation de {tex`f''`} en utilisant le{' '}
                <em>quotient différentiel central</em> deux fois, avec le pas {tex`h = 10^{-3}`}.
              </li>
            </ul>
            <p>Nommez les axes.</p>
          </>
        }
        tests={[
          { type: 'plot', x: [-1, 1], y: '-np.sin(x)' },
          {
            type: 'plot',
            x: [-1, 1],
            y: '(np.sin(x + 2e-3) - 2 * np.sin(x) + np.sin(x - 2e-3)) / (2e-3**2)',
          },
          { type: 'axisLabels', x: /x/, y: /y/ },
        ]}
      />
      <Matplotlib
        prompt={
          <>
            <p>Sur l'intervalle {tex`[-1, 1]`}, tracez les courbes suivantes:</p>
            <ul class="my-2 list-inside list-disc px-2">
              <li>
                la <strong>dérivée seconde</strong> de {tex`f(x) = \cos x`}
              </li>
              <li>
                Une approximation de {tex`f''`} en utilisant le{' '}
                <em>quotient différentiel central</em> deux fois, avec le pas {tex`h = 10^{-3}`}.
              </li>
            </ul>
            <p>Nommez les axes.</p>
          </>
        }
        tests={[
          { type: 'plot', x: [-1, 1], y: '-np.cos(x)' },
          {
            type: 'plot',
            x: [-1, 1],
            y: '(np.cos(x + 2e-3) - 2 * np.cos(x) + np.cos(x - 2e-3)) / (2e-3**2)',
          },
          { type: 'axisLabels', x: /x/, y: /y/ },
        ]}
      />
      <Matplotlib
        prompt={
          <>
            <p>Sur l'intervalle {tex`[-1, 1]`}, tracez les courbes suivantes:</p>
            <ul class="my-2 list-inside list-disc px-2">
              <li>
                la <strong>dérivée seconde</strong> de {tex`e^{-x}`}
              </li>
              <li>
                Une approximation de {tex`f''`} en utilisant le{' '}
                <em>quotient différentiel central</em> deux fois, avec le pas {tex`h = 10^{-3}`}.
              </li>
            </ul>
            <p>Nommez les axes.</p>
          </>
        }
        tests={[
          { type: 'plot', x: [-1, 1], y: 'np.exp(-x)' },
          {
            type: 'plot',
            x: [-1, 1],
            y: '(np.exp(-(x + 2e-3)) - 2 * np.exp(-x) + np.exp(-(x - 2e-3))) / (2e-3**2)',
          },
          { type: 'axisLabels', x: /x/, y: /y/ },
        ]}
      />
    </Sequence>
  )
}
