import { Code, Page } from '@learning/components'
import { expr, tex } from '@learning/core'
import { Factor } from '@learning/exercises/math/algebra/Factor'
import { PythonCode } from '@learning/exercises/python/code'
import { sample } from 'es-toolkit'

export default () => (
  <Page title="Tests">
    <Code lang="python" run>
      {'3 + 4'}
    </Code>
    <Factor
      id="test2"
      data={async () => ({
        expr: await expr('(x - a) (x - b)')
          .subs({ a: sample([1, 2, 3]), b: sample([1, 2, 3]) })
          .expand()
          .latex(),
      })}
    ></Factor>
    <Factor
      id="test5"
      data={async () => ({
        expr: await expr('(x - a) (x - b)')
          .subs({ a: sample([1, 2, 3]), b: sample([1, 2, 3]) })
          .expand()
          .latex(),
      })}
    />
    <PythonCode
      id="test3"
      data={{
        prompt: <>{tex`f(x) = x^2`}</>,
        tests: [1, 2, 3, 4, 8].map((x) => ({
          test: `f(${x})`,
          check: (out) => out.result === `${x ** 2}`,
        })),
      }}
    />
  </Page>
)
