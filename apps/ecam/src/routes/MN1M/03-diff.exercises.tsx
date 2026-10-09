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
            proches, tels que {tex`(1, 1)`} et {tex`(1 + 10^{-8}, 1 + 10^{-16})`}.
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
            prompt={<p>Quel aurait dû être la réponse?</p>}
            grade={(attempt) => attempt.isEqual(`\\frac{1}{10}`)}
          >
            <p>
              Ceci est dû au fait que Python utilise environ {tex`15`} chiffres significatifs, et
              donc
            </p>
            {tex`
              \Delta y = \overbrace{(1 + 10^{-16})}^{\approx 1 \ \text{(15 ch. sig.)}} - 1 \approx 0
            `}
            <p>
              Remarquez que le problème ne se pose <em>presque pas</em> avec les points{' '}
              {tex`(1, 0)`} et {tex`(1 + 10^{-15}, 10^{-16})`}.
            </p>
            <Code
              lang="python"
              run
              highlight={[-1]}
              children={
                ctx.inputs.code +
                '\n\n' +
                dedent /* python */ `
                pente([1, 0], [1 + 1e-15, 1e-16])
              `
              }
            />
            <p>
              Dans ce cas-ci, la pente n'est pas exacte car Python ne peut pas représenter{' '}
              {tex`0.1`} exactement, et l'erreur se propage.
            </p>
          </Simple>
        </>
      )}
    </PythonFunction>
  )
}

export function Secant() {
  return (
    <Matplotlib
      id="Secant"
      prompt={
        <>
          <p>
            Tracez le graphe de {tex`f(x) = \sin x`} sur {tex`[-\pi, \pi]`}, ainsi que de la droite
            qui croise le graphe en {tex`x = -2`} et {tex`x = 2`}. Nommez les axes.
          </p>
        </>
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
  )
}

export function Differences() {
  return (
    <Sequence id="differential-quotients">
      <DifferentialQuotient type="forward" f="x^2" x="1" h="0.1" />
      <DifferentialQuotient type="backward" f="x^2" x="1" h="10^{-6}" />
      <DifferentialQuotient type="forward" f="\sin x" x="0" h="10^{-20}" />
    </Sequence>
  )
}
