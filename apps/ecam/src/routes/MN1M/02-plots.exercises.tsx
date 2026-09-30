import { Sequence, tex } from '@learning/core'
import { PythonCode } from '@learning/exercises/python/Code'
import { PythonFunction } from '@learning/exercises/python/Function'
import { Matplotlib } from '@learning/exercises/python/Matplotlib'
import dedent from 'dedent'
import { Remark } from '../../../../../packages/components'

export const Exercises = {
  FirstFunctions: () => (
    <Sequence id="first-functions">
      <PythonFunction
        fnName="ma_premiere_fonction"
        prompt={
          <p>
            Définissez une fonction <code>ma_premiere_fonction</code> qui affiche le texte{' '}
            <code>Vive Python!</code>. Ensuite, appelez cette fonction <strong>deux fois</strong>.
          </p>
        }
        tests={[
          {
            input: [],
            correct: (output) => output === 'Vive Python!\n'.repeat(3).trim(),
            type: 'stdout',
          },
          {
            desc: 'La fonction est bien appelée deux fois',
            test: null,
            check: ({ stdout }) => stdout === 'Vive Python!\nVive Python!\n',
          },
        ]}
      />
      <PythonFunction
        fnName="test"
        prompt={
          <p>
            Définissez une fonction <code>test</code> qui affiche le texte <code>A</code>, puis{' '}
            <code>B</code> à la ligne suivante, en deux instructions. N'appelez{' '}
            <strong>pas encore</strong> cette fonction. Ensuite, affichez le texte <code>C</code> à
            l'écran, <strong>hors de la fonction</strong>. Enfin, appelez la fonction{' '}
            <code>test</code> une seule fois.
          </p>
        }
        tests={[
          { test: null, desc: 'Affiche C', check: ({ stdout }) => stdout === 'C\nA\nB\n' },
          { input: [], correct: (output) => output === 'C\nA\nB\nA\nB', type: 'stdout' },
          { desc: '3 appels de print', test: (code) => code.match(/print/g)?.length === 3 },
        ]}
      />
    </Sequence>
  ),
  Parameters: () => (
    <Sequence id="parameters">
      <PythonFunction
        fnName="double"
        prompt={
          <p>
            Définissez une fonction <code>double</code>, qui prend un paramètre et affiche le double
            de cette valeur à l'écran. Appelez ensuite cette fonction avec la valeur {tex`3`}.
          </p>
        }
        tests={[
          { test: null, desc: 'Affiche 6', check: ({ stdout }) => stdout === '6\n' },
          { input: [2], correct: (output) => output === '6\n4', type: 'stdout' },
          { input: [5], correct: (output) => output === '6\n10', type: 'stdout' },
        ]}
      />
      <PythonFunction
        fnName="produit"
        prompt={
          <p>
            Définissez une fonction <code>produit</code>, qui prend deux paramètres et affiche leur
            produit à l'écran. Appelez ensuite cette fonction avec les valeurs {tex`5`} et {tex`3`}.
          </p>
        }
        tests={[
          { test: null, desc: 'Affiche 15', check: ({ stdout }) => stdout === '15\n' },
          { input: [2, 2], correct: (output) => output === '15\n4', type: 'stdout' },
          { input: [15, 1], correct: (output) => output === '15\n15', type: 'stdout' },
        ]}
      />
    </Sequence>
  ),
  Functions: () => (
    <Sequence id="functions">
      <PythonFunction
        fnName="perimetre_carre"
        prompt={
          <p>
            Définissez une fonction <code>perimetre_carre</code> qui prend en entrée la longueur du
            côté d'un carré et qui retourne son périmètre. Appelez-la ensuite avec la valeur{' '}
            {tex`5`}.
          </p>
        }
        tests={[
          { test: null, desc: 'Affiche 20', check: ({ result }) => result === '20' },
          ...[1, 2, 3, 7, 10].map((x) => ({
            input: [x],
            correct: (output?: string) => output === (4 * x).toString(),
          })),
        ]}
      />
      <PythonFunction
        fnName="aire_triangle"
        prompt={
          <p>
            Définissez une fonction <code>aire_triangle</code> qui prend en entrée la longueur du
            côté d'un <strong>triangle équilatéral</strong> et qui retourne son aire. Vous pouvez
            appeler la fonction pour la tester.
          </p>
        }
        tests={[1, 2, 3, 4, 5].map((x) => ({
          input: [x],
          correct: (output) => approx(output ?? 0, (x ** 2 * Math.sin(Math.PI / 3)) / 2),
        }))}
      />
      <PythonFunction
        fnName="angle_vecteurs"
        prompt={
          <p>
            Définissez une fonction <code>angle_vecteurs</code> qui prend en entrée deux listes et
            qui retourne l'angle <strong>en degrés</strong> entre les vecteurs associés à ces
            listes. Vous pouvez appeler la fonction pour la tester.
          </p>
        }
        tests={[
          {
            input: ['[1, 0]', '[0, 1]'],
            correct: (output) => output === '90',
          },
          {
            input: ['[1, 0]', '[1, 0]'],
            correct: (output) => output === '0',
          },
          {
            input: ['[0, 1]', '[0, 1]'],
            correct: (output) => output === '0',
          },
          {
            input: ['[1, 0]', '[-1, 0]'],
            correct: (output) => output === '180',
          },
        ]}
      />
      <PythonFunction
        fnName="distance"
        prompt={
          <p>
            Définissez une fonction <code>distance</code> qui prend en entrée deux listes et qui
            retourne la distance entre les points associés à ces listes. Vous pouvez appeler la
            fonction pour la tester.
          </p>
        }
        tests={[
          {
            input: ['[0, 0]', '[1, 1]'],
            correct: (output) => output === Math.sqrt(2).toString(),
          },
          {
            input: ['[1, 2]', '[4, 6]'],
            correct: (output) => output === '5',
          },
          {
            input: ['[0, 0]', '[0, 0]'],
            correct: (output) => output === '0',
          },
        ]}
      />
    </Sequence>
  ),
  PiecewiseLinear: () => (
    <Sequence id="piecewise-linear">
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe d'une fonction linéaire par morceaux passant par les points{' '}
            {tex`(0, 0)`}, {tex`(1, 1)`}, et {tex`(2, 0)`}.
          </p>
        }
        tests={[{ type: 'points', x: [0, 1, 2], y: [0, 1, 0] }]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe d'une fonction linéaire par morceaux passant par les points{' '}
            {tex`(3, -2)`}, {tex`(5, 7)`}, et {tex`(7, 3)`}.
          </p>
        }
        tests={[{ type: 'points', x: [3, 5, 7], y: [-2, 7, 3] }]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe d'une fonction linéaire par morceaux passant par les points{' '}
            {tex`(-1, 4)`}, {tex`(2, 10)`}, et {tex`(5, -11)`}.
          </p>
        }
        tests={[{ type: 'points', x: [-1, 2, 5], y: [4, 10, -11] }]}
      />
    </Sequence>
  ),
  Discretization: () => (
    <Sequence id="discretization">
      <PythonCode
        prompt={
          <p>
            Créez une variable <code>x</code> contenant {tex`100`} points uniformément répartis
            entre {tex`0`} et {tex`10`}.
          </p>
        }
        tests={[
          {
            desc: 'La variable x est un vecteur de 100 points',
            test: 'len(x)',
            check: (output) => output.result === '100',
          },
          {
            desc: 'La première composante de x est 0',
            test: 'x[0]',
            check: (output) => output.result === '0',
          },
          {
            desc: 'La dernière composante de x est 10',
            test: 'x[-1]',
            check: (output) => output.result === '10',
          },
          {
            desc: 'Les points de x sont uniformément répartis entre 0 et 10',
            test: dedent /* python */ `
              import numpy as np
              np.allclose(np.diff(x), np.diff(x)[0])
            `,
            check: (output) => output.result?.toLowerCase() === 'true',
          },
        ]}
      />
      <PythonCode
        prompt={
          <p>
            Définissez un vecteur <code>x</code> contenant {tex`50`} points uniformément répartis
            entre {tex`-\pi`} et {tex`\pi`}.
          </p>
        }
        tests={[
          {
            desc: 'La variable x est un vecteur de 50 points',
            test: 'len(x)',
            check: (output) => output.result === '50',
          },
          {
            desc: 'La première composante de x est -pi',
            test: 'x[0]',
            check: (output) => output.result === (-Math.PI).toString(),
          },
          {
            desc: 'La dernière composante de x est pi',
            test: 'x[-1]',
            check: (output) => output.result === Math.PI.toString(),
          },
          {
            desc: 'Les points de x sont uniformément répartis',
            test: dedent /* python */ `
              import numpy as np
              np.allclose(np.diff(x), np.diff(x)[0])
            `,
            check: (output) => output.result?.toLowerCase() === 'true',
          },
        ]}
      />
      <PythonCode
        prompt={
          <>
            <p>
              Définissez un vecteur <code>x</code> contenant les nombres entiers naturels de{' '}
              {tex`0`} à {tex`10`}. Ensuite, utilisez <code>x</code> pour définir un vecteur{' '}
              <code>y</code> contenant les 11 premiers termes de la suite géométrique{' '}
              {tex`3, 6, 12, \dots`}.
            </p>
            <p>
              <em>Indication</em>: l'exponentielle est bien vectorisée également.
            </p>
          </>
        }
        tests={[
          {
            desc: 'La variable x a le bon nombre de composantes',
            test: 'len(x)',
            check: (output) => output.result === '11',
          },
          {
            desc: 'La première composante de x est 0',
            test: 'x[0]',
            check: (output) => output.result === '0',
          },
          {
            desc: 'La dernière composante de x est 10',
            test: 'x[-1]',
            check: (output) => output.result === '10',
          },
          {
            desc: 'Les points de x sont uniformément répartis',
            test: dedent /* python */ `
              import numpy as np
              np.allclose(np.diff(x), np.diff(x)[0])
            `,
            check: (output) => output.result?.toLowerCase() === 'true',
          },
          {
            desc: 'La variable y est la suite géométrique de raison 2 et de premier terme 3',
            test: dedent /* python */ `
              import numpy as np
              np.allclose(y, 3 * 2 ** x)
            `,
            check: (output) => output.result?.toLowerCase() === 'true',
          },
        ]}
      />
    </Sequence>
  ),
  Polynomials: () => (
    <Sequence id="polynomials">
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = x^2 - 5x + 3`} sur {tex`[-4, 4]`}.
          </p>
        }
        tests={[{ type: 'plot', x: [-4, 4], y: 'x**2 - 5*x + 3', n: 40 }]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = 1 / (x^2 + 1)`} sur {tex`[-1, 1]`}.
          </p>
        }
        tests={[{ type: 'plot', x: [-1, 1], y: '1 / (x**2 + 1)', n: 40 }]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = x^3 - 3x^2 + 5x - 1`} sur {tex`[0, 7]`}.
          </p>
        }
        tests={[{ type: 'plot', x: [0, 7], y: 'x**3 - 3*x**2 + 5*x - 1', n: 40 }]}
      />
    </Sequence>
  ),
  Vectorization: () => (
    <Sequence id="vectorization">
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = \ln x`} sur {tex`[3, 7]`}
          </p>
        }
        tests={[{ type: 'plot', x: [3, 7], y: 'np.log(x)', n: 40 }]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = \sqrt x`} sur {tex`[0, 9]`}
          </p>
        }
        tests={[{ type: 'plot', x: [0, 9], y: 'np.sqrt(x)', n: 40 }]}
      />
    </Sequence>
  ),
  PrettyPlots: () => (
    <Sequence id="pretty-plots">
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = x^3`} sur {tex`[-1, 1]`}. Assurez-vous que les axes sont
            affichés et correctement nommés.
          </p>
        }
        tests={[
          { type: 'axes', value: 'both' },
          { type: 'axisLabels', x: /x/i, y: /y/i },
          { type: 'plot', x: [-1, 1], y: 'x**3', n: 40 },
        ]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = x^2`} sur {tex`[-2, 2]`}. Assurez-vous que les axes sont
            affichés et correctement nommés.
          </p>
        }
        tests={[
          { type: 'axes', value: 'both' },
          { type: 'axisLabels', x: /x/i, y: /y/i },
          { type: 'grid', value: true },
          { type: 'plot', x: [-2, 2], y: 'x**2', n: 40 },
        ]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = \cos x`} sur {tex`[-\pi, \pi]`}. Assurez-vous que les
            axes sont affichés, correctement nommés et que la grille est affichée. Le titre de la
            figure doit être {tex`\cos x`}
          </p>
        }
        tests={[
          { type: 'axes', value: 'both' },
          { type: 'axisLabels', x: /x/i, y: /y/i },
          { type: 'grid', value: true },
          { type: 'title', pattern: /cos x/i },
          { type: 'plot', x: [-Math.PI, Math.PI], y: `np.cos(x)`, n: 40 },
        ]}
      />
    </Sequence>
  ),
  MultiplePlots: () => (
    <Sequence id="multiple-plots">
      <Matplotlib
        prompt={
          <p>
            Tracez les graphes de {tex`f(x) = x^2`}, {tex`g(x) = \sqrt x`} et {tex`h(x) = x`} sur{' '}
            {tex`[0, 1]`}. Assurez-vous que les axes sont affichés, correctement nommés, que la
            grille est affichée, et que vous employez la <strong>même échelle</strong> pour {tex`x`}{' '}
            et {tex`y`}.
          </p>
        }
        tests={[
          { type: 'axes', value: 'both' },
          { type: 'axisLabels', x: /x/i, y: /y/i },
          { type: 'grid', value: true },
          { type: 'lineCount', value: 5 },
          { type: 'sameScale' },
          { type: 'plot', x: [0, 1], y: 'x**2', n: 40 },
          { type: 'plot', x: [0, 1], y: 'x', n: 40 },
          { type: 'plot', x: [0, 1], y: 'np.sqrt(x)', n: 40 },
        ]}
      >
        <Remark>
          <p>
            Observez que les graphes sont symétriques par rapport à la droite {tex`y = x`}. Ceci
            n'est pas accidentel. Ceci se produit lorsque {tex`f(x)`} et {tex`g(x)`} sont{' '}
            <strong>réciproques</strong>.
          </p>
        </Remark>
      </Matplotlib>
      <Matplotlib
        prompt={
          <p>
            Tracez les graphes de {tex`f(x) = \sin x`} et{' '}
            {tex`g(x) = x - \frac{x^3} 6 + \frac{x^5} {120}`} sur {tex`[-\pi, \pi]`}. Assurez-vous
            que les axes sont correctement nommés et que la grille est affichée. Le titre de la
            figure doit être <code>Approximation polynomiale</code>.
          </p>
        }
        tests={[
          { type: 'axes', value: 'both' },
          { type: 'axisLabels', x: /x/i, y: /y/i },
          { type: 'grid', value: true },
          { type: 'lineCount', value: 4 },
          { type: 'title', pattern: /Approximation polynomiale/i },
          { type: 'plot', x: [-Math.PI, Math.PI], y: `np.sin(x)`, n: 40 },
          { type: 'plot', x: [-Math.PI, Math.PI], y: `x - x**3/6 + x**5/120`, n: 40 },
        ]}
      >
        <Remark>
          <p>
            Remarquez que les deux graphes sont très proches autour de {tex`0`}. Ceci n'est pas une
            coïncidence. L'ordinateur ne connaît que les opérations arithmétiques de base, et pour
            les fonctions plus complexes, il procède à une approximation polynomiale. En
            l'occurence,
          </p>
          {tex`
            \sin x \approx x - \frac{x^3} {3 \cdot 2 \cdot 1}
            + \frac{x^5} {5 \cdot 4 \cdot 3 \cdot 2 \cdot 1}
            - \frac{x^7} {7 \cdot 6 \cdot 5 \cdot 4 \cdot 3 \cdot 2 \cdot 1}
            + \frac{x^9} {9 \cdot 8 \cdot 7 \cdot 6 \cdot 5 \cdot 4 \cdot 3 \cdot 2 \cdot 1}
            + \dots
          `}
        </Remark>
      </Matplotlib>
    </Sequence>
  ),
}

function approx(a: string | number, b: number | number, error = 1e-6) {
  const parse = (x: string | number) => (typeof x === 'string' ? parseFloat(x) : x)
  return Math.abs(parse(a) - parse(b)) < error
}
