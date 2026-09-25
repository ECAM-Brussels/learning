import { createDerivedStep, omitFromJSON } from '@learning/core'
import type { JSX } from '@solidjs/web'
import { dedent } from 'es-toolkit/string'
import * as v from 'valibot'
import { PythonCode } from './Code'

const Test = v.variant('type', [
  v.object({
    type: v.literal('plot'),
    x: v.tuple([v.number(), v.number()]),
    y: v.string(),
    n: v.optional(v.number(), 40),
  }),
  v.object({
    type: v.literal('lineCount'),
    value: v.number(),
  }),
  v.object({
    type: v.literal('title'),
    pattern: v.instance(RegExp),
  }),
])

export const Matplotlib = createDerivedStep(
  PythonCode,
  { prompt: omitFromJSON(v.custom<JSX.Element>(() => true)), tests: omitFromJSON(v.array(Test)) },
  (props) => ({
    math: true,
    prompt: props.prompt,
    tests: props.tests.map((t) => {
      switch (t.type) {
        case 'lineCount':
          return {
            desc: `La figure contient ${t.value} courbes`,
            test: dedent /* python */ `
              import matplotlib.pyplot as plt
              fig = plt.gcf()
              ax = plt.gcf().axes[0]
              len(ax.get_lines())
            `,
            check: ({ result }) => result === t.value.toString(),
          }
        case 'plot':
          return {
            desc: `La figure contient la courbe demandée`,
            test: dedent /* python */ `
              import matplotlib.pyplot as plt
              fig = plt.gcf()
              ax = plt.gcf().axes[0]
              result = False

              for line in ax.get_lines():
                x = line.get_xdata()
                y = line.get_ydata()
                checks = [
                  bool(x[0] == ${t.x[0]} and x[-1] == ${t.x[1]}),
                  len(x) > ${t.n},
                  np.allclose(y, ${t.y}),
                ]
                if all(checks):
                  result = True
                  break

              plt.close("all") 
              result
            `,
            check: ({ result }) => result?.toLowerCase() === 'true',
          }
        case 'title':
          return {
            desc: `Le titre de la figure correspond à l'énoncé`,
            test: dedent /* python */ `
              import matplotlib.pyplot as plt
              fig = plt.gcf()
              ax = plt.gcf().axes[0]
              title = ax.get_title()
              plt.close("all")
              title
            `,
            check: ({ result }) => t.pattern.test(result ?? ''),
          }
      }
    }),
  }),
  { name: 'python/matplotlib' },
)
