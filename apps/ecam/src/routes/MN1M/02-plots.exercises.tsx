import { Sequence, tex } from '@learning/core'
import { PythonCode } from '@learning/exercises/python/Code'
import { PythonFunction } from '@learning/exercises/python/Function'
import { Matplotlib } from '@learning/exercises/python/Matplotlib'
import dedent from 'dedent'

export const Exercises = {
  Functions: () => (
    <Sequence id="functions">
      <PythonFunction
        fnName="aire_carre"
        prompt={
          <p>
            Définissez une fonction <code>aire_carre</code> qui prend en entrée un paramètre{' '}
            <code>cote</code> et qui retourne l'aire d'un carré de côté <code>cote</code>.
          </p>
        }
        tests={[1, 2, 3, 7, 10].map((x) => ({ input: [x], output: (x ** 2).toString() }))}
      />
      <PythonFunction
        fnName="aire_triangle"
        prompt={
          <p>
            Définissez une fonction <code>aire_triangle</code> qui prend en entrée un paramètre{' '}
            <code>cote</code> et qui retourne l'aire d'un <strong>triangle équilatéral</strong> de
            côté <code>cote</code>.
          </p>
        }
        tests={[1, 2, 3, 4, 5].map((x) => ({
          input: [x],
          output: (x ** 2 * Math.sin(Math.PI / 3)) / 2,
        }))}
      />
      <PythonFunction
        fnName="angle_vecteurs"
        prompt={
          <p>
            Définissez une fonction <code>angle_vecteurs</code> qui prend en entrée deux listes{' '}
            <code>a</code> et <code>b</code> et qui retourne l'angle <strong>en degrés</strong>{' '}
            entre les vecteurs associés à ces listes.
          </p>
        }
        tests={[
          {
            input: ['[1, 0]', '[0, 1]'],
            output: '90',
          },
          {
            input: ['[1, 0]', '[1, 0]'],
            output: '0',
          },
          {
            input: ['[0, 1]', '[0, 1]'],
            output: '0',
          },
          {
            input: ['[1, 0]', '[-1, 0]'],
            output: '180',
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
            Tracez les graphes de {tex`f(x) = x^2`} et {tex`g(x) = x^3`} sur {tex`[-1, 1]`}.
            Assurez-vous que les axes sont correctement nommés et que la grille est affichée.
          </p>
        }
        tests={[
          { type: 'axes', value: 'both' },
          { type: 'axisLabels', x: /x/i, y: /y/i },
          { type: 'grid', value: true },
          { type: 'lineCount', value: 4 },
          { type: 'plot', x: [-1, 1], y: 'x**2', n: 40 },
          { type: 'plot', x: [-1, 1], y: 'x**3', n: 40 },
        ]}
      />
      <Matplotlib
        prompt={
          <p>
            Tracez les graphes de {tex`f(x) = \sin x`} et {tex`g(x) = \cos x`} sur{' '}
            {tex`[-\pi, \pi]`}. Assurez-vous que les axes sont correctement nommés et que la grille
            est affichée. Le titre de la figure doit être "{tex`\sin x`} et {`\cos x`}".
          </p>
        }
        tests={[
          { type: 'axes', value: 'both' },
          { type: 'axisLabels', x: /x/i, y: /y/i },
          { type: 'grid', value: true },
          { type: 'lineCount', value: 4 },
          { type: 'title', pattern: /sin x et cos x/i },
          { type: 'plot', x: [-Math.PI, Math.PI], y: `np.sin(x)`, n: 40 },
          { type: 'plot', x: [-Math.PI, Math.PI], y: `np.cos(x)`, n: 40 },
        ]}
      />
    </Sequence>
  ),
}
