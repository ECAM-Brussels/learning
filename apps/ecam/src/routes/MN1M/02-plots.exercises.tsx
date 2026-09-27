import { Sequence, tex } from '@learning/core'
import { PythonCode } from '@learning/exercises/python/Code'
import { Matplotlib } from '@learning/exercises/python/Matplotlib'
import type { FinalOutput } from '@learning/repl'
import type { JSX } from '@solidjs/web'

export function FunctionExercise<T extends any[]>(props: {
  prompt: JSX.Element
  fnName: string
  tests: [T, string][]
}) {
  return (
    <PythonCode
      prompt={props.prompt}
      tests={[
        {
          desc: `La fonction ${props.fnName} est bien définie`,
          test: `callable(${props.fnName})`,
          check: ({ result }) => result === 'true',
        },
        ...props.tests.map((test) => ({
          test: `${props.fnName}(${test[0].join(',')})`,
          check: (output: FinalOutput) => output.result === test[1],
        })),
      ]}
    />
  )
}

export function PrettyPlotsSequence() {
  return (
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
  )
}
