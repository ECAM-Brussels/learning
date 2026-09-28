import { Sequence, tex } from '@learning/core'
import { PythonFunction } from '@learning/exercises/python/Function'
import { Matplotlib } from '@learning/exercises/python/Matplotlib'

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
        tests={[1, 2, 3, 7, 10].map((x) => ['x', String(x ** 2)])}
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
        tests={[1, 2, 3, 4, 5].map((x) => ['x', String((x ** 2 * Math.sin(Math.PI / 3)) / 2)])}
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
          ['[1, 0], [0, 1]', '90'],
          ['[1, 0], [1, 0]', '0'],
          ['[0, 1], [0, 1]', '0'],
          ['[1, 0], [-1, 0]', '180'],
        ]}
      />
    </Sequence>
  ),
  PrettyPlots: () => (
    <Sequence id="pretty-plots">
      <Matplotlib
        prompt={
          <p>
            Tracez le graphe de {tex`f(x) = x^3`} sur {tex`[-1, 1]`}. Assurez-vous que les axes sont
            correctement nommés.
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
            correctement nommés et que la grille est affichée.
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
            axes sont correctement nommés et que la grille est affichée. Le titre de la figure doit
            être {tex`\cos x`}
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
}
