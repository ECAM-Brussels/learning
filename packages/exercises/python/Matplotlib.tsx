import { createDerivedStep, omitFromJSON } from '@learning/core'
import { dedent } from 'es-toolkit/string'
import * as v from 'valibot'
import { PythonCode } from './Code'

const Test = v.variant('type', [
  v.object({
    type: v.literal('axes'),
    value: v.optional(v.union([v.literal('x'), v.literal('y'), v.literal('both')]), 'both'),
  }),
  v.object({
    type: v.literal('axisLabels'),
    x: v.instance(RegExp),
    y: v.instance(RegExp),
  }),
  v.object({
    type: v.literal('grid'),
    value: v.optional(v.boolean(), true),
  }),
  v.object({
    type: v.literal('plot'),
    x: v.tuple([v.number(), v.number()]),
    y: v.string(),
    n: v.optional(v.number(), 40),
  }),
  v.object({
    type: v.literal('points'),
    x: v.array(v.number()),
    y: v.array(v.number()),
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
  { prompt: 'jsx', tests: omitFromJSON(v.array(Test)) },
  (props) => ({
    math: true,
    prompt: props.prompt,
    tests: props.tests.map((t) => {
      switch (t.type) {
        case 'axes':
          return {
            desc: 'La figure contient les axes demandés',
            test: (code) => {
              const x = /\baxhline\s*\(\s*0\s*[,)]/.test(code)
              const y = /\baxvline\s*\(\s*0\s*[,)]/.test(code)
              if (t.value === 'x') return x
              if (t.value === 'y') return y
              else return x && y
            },
          }
        case 'axisLabels':
          return {
            desc: `Les axes sont correctement nommés`,
            test: dedent /* python */ `
              import matplotlib.pyplot as plt
              import json
              ax = plt.gcf().axes[0]
              x_label = ax.get_xlabel()
              y_label = ax.get_ylabel()
              plt.close("all")
              json.dumps({ "x": x_label, "y": y_label })
            `,
            check: ({ result }) => {
              if (!result) return false
              const { x, y } = JSON.parse(result) as { x: string; y: string }
              return t.x.test(x) && t.y.test(y)
            },
          }
        case 'grid':
          return {
            desc: `La figure contient la grille`,
            test: dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              x = any(line.get_visible() for line in ax.get_xgridlines())
              y = any(line.get_visible() for line in ax.get_ygridlines())
              plt.close("all")
              x and y
            `,
            check: (output) => output.result?.toLowerCase() === t.value.toString(),
          }
        case 'lineCount':
          return {
            desc: `La figure contient ${t.value} courbes`,
            test: dedent /* python */ `
              import matplotlib.pyplot as plt
              ax = plt.gcf().axes[0]
              plt.close("all")
              len(ax.get_lines())
            `,
            check: (output) => output.result === t.value.toString(),
          }
        case 'plot':
          return {
            desc: `La figure contient la courbe demandée`,
            test: dedent /* python */ `
              import matplotlib.pyplot as plt
              import numpy as np
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
        case 'points':
          return {
            desc: `La figure contient les points demandés`,
            test: dedent /* python */ `
              import matplotlib.pyplot as plt
              import numpy as np
              ax = plt.gcf().axes[0]
              result = False

              for line in ax.get_lines():
                x = line.get_xdata()
                y = line.get_ydata()
                checks = [
                  np.allclose(x, ${JSON.stringify(t.x)}),
                  np.allclose(y, ${JSON.stringify(t.y)}),
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
