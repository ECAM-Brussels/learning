import { Board } from '@learning/components'
import { createDerivedStep, expr, Sequence, tex } from '@learning/core'
import { PythonCode } from '@learning/exercises/python/Code'
import { dedent, randomInt, range, sum } from 'es-toolkit'
import { createSignal, createStore, For, Repeat, Show, type ComponentProps } from 'solid-js'
import * as v from 'valibot'

export function RiemannSum(props: {
  latex?: string
  f: (x: number) => number
  domain: [number, number]
  n: number
  type?: ComponentProps<typeof Board.RiemannSum>['type']
  hideHeading?: boolean
}) {
  const [n, setN] = createSignal(() => props.n)
  const dx = () => (props.domain[1] - props.domain[0]) / n()
  const x = () => range(n() + 1).map((i) => props.domain[0] + i * dx())
  const integral = () =>
    sum(
      x()
        .slice(0, -1)
        .map((x) => props.f(x) * dx()),
    )
  const theoretical = () =>
    props.latex ? expr(props.latex).integrate('x', props.domain[0], props.domain[1]) : null
  return (
    <>
      <Show when={!props.hideHeading}>
        <h3 class="text-center">
          <label>
            Approximation de l'aire utilisant{' '}
            <input
              class="w-24 rounded border border-gray-400 px-4 py-1"
              type="number"
              value={n()}
              onInput={(e) => setN(Number(e.currentTarget.value))}
              min={1}
            />{' '}
            intervalles
          </label>
        </h3>
        <div class="flex justify-center gap-8">
          <label>Aire approchée: {integral()}</label>
          <label>Résultat théorique {tex`\approx ${theoretical()?.N()}`}</label>
        </div>
      </Show>
      <Board>
        <Board.Axis from={[0, 0]} to={[1, 0]} ticks={{ visible: false }} />
        <Board.RiemannSum f={props.f} domain={props.domain} n={n()} type={props.type} />
        <Repeat count={2}>
          {(i) => (
            <Board.Segment
              from={[props.domain[i]!, 0]}
              to={[props.domain[i]!, props.f(props.domain[i]!)]}
              strokeWidth={2}
              dash={1}
              fixed
            />
          )}
        </Repeat>
        <Board.Plot fn={props.f} strokeWidth={2} strokeColor="darkred" domain={props.domain} />
      </Board>
    </>
  )
}

export function Partition(props: {}) {
  const a = -4.5
  const b = 4.5
  const [n, setN] = createSignal(10)
  const dx = () => (b - a) / n()
  return (
    <>
      <h3 class="text-center">
        Partition avec{' '}
        <input
          type="number"
          value={n()}
          onInput={(e) => setN(Number(e.currentTarget.value))}
          min={1}
          class="w-24 rounded border border-gray-400 px-4 py-1"
        />{' '}
        intervalles de longueur {tex`\mathrm{d}x = \frac{b - a}{${n()}}`}
      </h3>
      <Board class="h-64">
        <Board.Segment from={[a, 0]} to={[b, 0]} strokeWidth={2} fixed />
        <Board.Text content={`a`} position={[a, 1]} anchorX="middle" anchorY="top" />
        <Board.Text content={`b`} position={[b, 1]} anchorX="middle" anchorY="top" />
        <Repeat count={n() + 1}>
          {(i) => (
            <>
              <Show when={i < n()}>
                <Board.Segment
                  from={[a + i * dx() + 0.01, 0.5]}
                  to={[a + (i + 1) * dx() - 0.01, 0.5]}
                  strokeColor="lightgray"
                  strokeWidth={2}
                  fixed
                  firstArrow
                  lastArrow
                />
                <Board.Text
                  content="\mathrm{d}x"
                  position={[a + i * dx() + dx() / 2, 1.4]}
                  anchorX="middle"
                  anchorY="top"
                />
              </Show>
              <Board.Segment
                from={[a + i * dx(), -0.1]}
                to={[a + i * dx(), 0.1]}
                strokeWidth={2}
                fixed
              />
              <Show when={i < n()}>
                <Board.Text
                  content={`x_{${i}}`}
                  position={[a + i * dx(), -0.2]}
                  anchorX="middle"
                  anchorY="top"
                  fixed
                />
              </Show>
            </>
          )}
        </Repeat>
      </Board>
    </>
  )
}

export const PartitionSequence = () => {
  return (
    <Sequence id="partition">
      <PythonCode
        prompt={
          <p>
            Donnez le <strong>vecteur des points milieux</strong> d'une partition de l'intervalle{' '}
            {tex`[-2, 2]`} en {tex`50`} intervalles.
          </p>
        }
        tests={(expect) => ({
          'Le vecteur donné est correct': expect.result().toEqualThatOf(dedent /* python */ `
            import numpy as np
            x = np.linspace(-2, 2, 51)
            (x[:-1] + x[1:]) / 2
          `),
        })}
      />
      <PythonCode
        prompt={
          <p>
            Donnez les <strong>points droits</strong> d'une partition de l'intervalle {tex`[-3, 1]`}{' '}
            en {tex`70`} intervalles.
          </p>
        }
        tests={(expect) => ({
          'Le vecteur donné est correct': expect.result().toEqualThatOf(dedent /* python */ `
            import numpy as np
            x = np.linspace(-3, 1, 71)
            x[1:]
          `),
        })}
      />
      <PythonCode
        prompt={
          <p>
            Donnez le <strong>pas</strong> d'une partition de l'intervalle {tex`[-\pi, \pi]`}
            en {tex`40`} intervalles.
          </p>
        }
        tests={(expect) => ({
          'Le vecteur donné est correct': expect.result().toEqualThatOf(dedent /* python */ `
            import numpy as np

            (2 * np.pi) / 40
          `),
        })}
      />
    </Sequence>
  )
}

const methods = {
  left: 'f(x)',
  right: 'f(x + dx)',
  midpoint: 'f(x + dx / 2)',
  trapezoid: '(f(x) + f(x + dx)) / 2',
  simpson: '(f(x) + 4 * f(x + dx / 2) + f(x + dx)) / 6',
}

export const NumericalIntegral = createDerivedStep(
  PythonCode,
  {
    prompt: 'jsx',
    average: v.optional(v.boolean(), false),
    f: 'expr',
    a: 'number',
    b: 'number',
    n: 'number',
    method: v.union([
      v.literal('left'),
      v.literal('right'),
      v.literal('midpoint'),
      v.literal('trapezoid'),
      v.literal('simpson'),
    ]),
  },
  (props) => ({
    prompt: props.prompt,
    tests: (expect) => ({
      'Contient "sum"': expect.code.toMatch(/sum/),
      'Contient "linspace"': expect.code.toMatch(/linspace/),
      'Le résultat est correct': expect.result().toEqualThatOf(dedent /* python */ `
        import numpy as np

        def f(x):
          return ${props.f.python()}

        x, dx = np.linspace(${props.a}, ${props.b}, ${props.n}, endpoint=False, retstep=True)
        y = ${methods[props.method]}
        np.sum(y * dx) ${props.average ? `/ (${props.b - props.a})` : ``}
      `),
    }),
  }),
)

export const AverageExample = () => (
  <Sequence id="average-example">
    <NumericalIntegral
      prompt={
        <p>
          Estimez la valeur moyenne de la fonction {tex`f(x) = \sqrt{x}`} sur l'intervalle{' '}
          {tex`[0, 3]`} en utilisant les <strong>points milieux</strong> d'une partition de{' '}
          {tex`200`} intervalles.
        </p>
      }
      f="\sqrt{x}"
      a={0}
      b={3}
      n={200}
      method="midpoint"
      average
    />
    <NumericalIntegral
      prompt={
        <p>
          Estimez la valeur moyenne de la fonction {tex`f(x) = \sin(x^2)`} sur l'intervalle{' '}
          {tex`[0, 2 \pi]`} en utilisant les <strong>points milieux</strong> d'une partition de{' '}
          {tex`150`} intervalles.
        </p>
      }
      f="\sin(x^2)"
      a={0}
      b={2 * Math.PI}
      n={150}
      method="midpoint"
      average
    />
  </Sequence>
)

export const KinematicsExample = () => (
  <Sequence id="kinematics-example">
    <NumericalIntegral
      prompt={
        <p>
          Estimez le déplacement net d'un objet dont la vitesse est donnée par{' '}
          {tex`v(t) = 3t^2 + 2t + 1`} sur l'intervalle {tex`[0, 5]`} en utilisant les{' '}
          <strong>points droits</strong> (et non pas les points milieux) d'une partition de{' '}
          {tex`100`} intervalles.
        </p>
      }
      f="3x^2 + 2x + 1"
      a={0}
      b={5}
      n={100}
      method="right"
    />
    <NumericalIntegral
      prompt={
        <p>
          Estimez le déplacement net par un objet dont la vitesse est donnée par{' '}
          {tex`v(t) = \sin t`} sur l'intervalle {tex`[0, \pi]`} en utilisant les{' '}
          <strong>points droits</strong> (et non pas les points milieux) d'une partition de{' '}
          {tex`200`} intervalles.
        </p>
      }
      f="\sin(x)"
      a={0}
      b={Math.PI}
      n={200}
      method="midpoint"
    />
  </Sequence>
)

export const TrapezoidExample = () => (
  <Sequence id="trapezoid">
    <NumericalIntegral
      prompt={
        <p>
          Estimez l'aire sous la courbe de la fonction {tex`f(x) = \sin x`} sur l'intervalle{' '}
          {tex`[0, \pi]`} en utilisant la <strong>règle des trapèzes</strong> avec une partition de{' '}
          {tex`50`} intervalles.
        </p>
      }
      f="\sin(x)"
      a={0}
      b={Math.PI}
      n={50}
      method="trapezoid"
    />
    <NumericalIntegral
      prompt={
        <p>
          Approximez l'intégrale {tex`\displaystyle \int_{-1}^1 e^{-x^2} \, \mathrm d x`} avec la
          méthode des trapèzes en utilisant 100 intervalles.
        </p>
      }
      f="\exp(-x^2)"
      a={-1}
      b={1}
      n={100}
      method="trapezoid"
    />
    <NumericalIntegral
      prompt={
        <p>
          Approximez la valeur moyenne de {tex`\frac 1 x`} sur {tex`[2, 5]`} en utilisant la méthode
          des trapèzes sur {tex`150`} intervalles.
        </p>
      }
      f="\frac{1}{x}"
      a={2}
      b={5}
      n={150}
      method="trapezoid"
      average
    />
  </Sequence>
)

export const Simpson = () => (
  <Sequence id="simpson">
    <NumericalIntegral
      prompt={
        <p>
          Estimez l'aire sous la courbe de la fonction {tex`f(x) = e^{-x^2}`} sur l'intervalle{' '}
          {tex`[-2, 2]`} en utilisant la <strong>méthode de Simpson</strong> avec une partition de{' '}
          {tex`200`} intervalles.
        </p>
      }
      f="\exp(-x^2)"
      a={-2}
      b={2}
      n={200}
      method="simpson"
    />
    <NumericalIntegral
      prompt={
        <p>
          Estimez le déplacement net d'un mobile dont la vitesse est donnée par{' '}
          {tex`v(t) = e^{-t^2} \cos(t^3)`} sur l'intervalle {tex`[0, 3]`} en utilisant la{' '}
          <strong>méthode de Simpson</strong> avec {tex`180`} intervalles.
        </p>
      }
      f="\exp(-x^2) \cos(x^3)"
      a={0}
      b={3}
      n={180}
      method="simpson"
    />
    <NumericalIntegral
      prompt={
        <p>
          Approximez la valeur moyenne de {tex`f(x) = \sin(x^2)`} sur {tex`[0, 4]`} en utilisant la{' '}
          <strong>méthode de Simpson</strong> sur {tex`240`} intervalles.
        </p>
      }
      f="\sin(x^2)"
      a={0}
      b={4}
      n={240}
      method="simpson"
      average
    />
  </Sequence>
)

export const Interpolation = (props: {
  x: number[]
  y?: number[]
  f?: (x: number) => number
  area?: boolean
  hideLabels?: boolean
}) => {
  const [x, setX] = createStore(() => props.x, [])
  const [y, setY] = createStore(
    () => props.y ?? props.x.map((x) => props.f?.(x) ?? randomInt(0, 4)),
    [],
  )
  const lagrange = () => {
    const points = x.map((x, i) => [x, y[i]!] as const)
    return (x: number) => {
      let sum = 0
      for (let i = 0; i < points.length; i++) {
        const [xi, yi] = points[i]!
        let product = yi
        for (let j = 0; j < points.length; j++) {
          if (i !== j) {
            const [xj] = points[j]!
            product *= (x - xj) / (xi - xj)
          }
        }
        sum += product
      }
      return sum
    }
  }
  return (
    <Board axis>
      <Show
        when={!props.f}
        fallback={
          <>
            <Board.Plot
              fn={props.f!}
              strokeWidth={2}
              strokeColor="darkred"
              name="f(x)"
              withLabel={!props.hideLabels}
            >
              {(curve) => (
                <For each={x}>
                  {(x, i) => (
                    <Board.Glider
                      position={[x, y[i()]!]}
                      on={curve}
                      name={`(${x}, f(${x}))`}
                      onDrag={(P) => {
                        setX((x) => {
                          x[i()] = P.X()
                        })
                        setY((y) => {
                          y[i()] = P.Y()
                        })
                      }}
                      withLabel={!props.hideLabels}
                    />
                  )}
                </For>
              )}
            </Board.Plot>
          </>
        }
      >
        <For each={x}>
          {(x, i) => (
            <Board.Line
              points={[
                [x, 0],
                [x, 1],
              ]}
              strokeWidth={0}
              fixed
            >
              {(line) => (
                <Board.Glider
                  on={line}
                  position={[x, y[i()]!]}
                  onDrag={(P) => {
                    setY((y) => {
                      y[i()] = P.Y()
                    })
                  }}
                  name={`(${x}, f(${x}))`}
                  fixed={props.f !== undefined}
                  label={{ autoPosition: true }}
                  withLabel={!props.hideLabels}
                />
              )}
            </Board.Line>
          )}
        </For>
      </Show>
      <Board.Plot
        fn={lagrange()}
        domain={[Math.min(...x), Math.max(...x)]}
        name="P(x)"
        withLabel={!props.hideLabels}
        strokeWidth={2}
        label={{ autoPosition: true }}
      >
        {(curve) => (
          <Show when={props.area}>
            <Board.Integral
              curve={curve}
              domain={[Math.min(...x), Math.max(...x)]}
              baseLeft={{ visible: false }}
              baseRight={{ visible: false }}
              curveLeft={{ visible: false }}
              curveRight={{ visible: false }}
            />
          </Show>
        )}
      </Board.Plot>
    </Board>
  )
}
