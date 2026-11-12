import { Board } from '@learning/components'
import { createDerivedStep, expr, Sequence, tex } from '@learning/core'
import { PythonCode } from '@learning/exercises/python/Code'
import dedent from 'dedent'
import { range } from 'es-toolkit'
import { createEffect, createProjection, createSignal, For, Repeat, Show } from 'solid-js'
import * as v from 'valibot'

// TODO: remove this

const SecondDerivative = createDerivedStep(PythonCode, { f: 'expr' }, (props) => ({
  math: true,
  prompt: (
    <>
      <p>
        Définissez la fonction <code>diff2(x)</code> qui correspond à la dérivée seconde de{' '}
        {tex`f(x) = ${props.f}`}, calculée avec la dérivation automatique.
      </p>
    </>
  ),
  tests: (expect) => ({
    'Le code utilise epsilon': expect.code.toMatch(/epsilon/),
    'Le code utilise delta': expect.code.toMatch(/delta/),
    'Le code utilise la dérivation automatique': expect.code.toMatch(/dual/),
    ...Object.fromEntries(
      range(-5, 6).map((n) => [
        `diff2(${n}) est correct`,
        expect.with(`diff2(${n})`).result().toEqualThatOf(dedent /* python */ `
          import numpy as np

          def f(x):
              return ${props.f.python()}

          f(${n} + epsilon + delta).dual.dual
        `),
      ]),
    ),
  }),
}))

export function SecondDerivativeSequence() {
  return (
    <Sequence id="second-derivative-sequence">
      <SecondDerivative f="x^2 - 6x + 13" />
      <SecondDerivative f="x^2 + e^{-x}" />
      <SecondDerivative f="x^2 + \sqrt{1 + x^2} + 0.8x" />
    </Sequence>
  )
}

export function NewtonRaphsonAnimation() {
  const fn = (x: number) => 0.1 * x ** 2 + 2 * Math.sin(0.5 * x + 4)
  const df = (x: number) => 0.2 * x + Math.cos(0.5 * x + 4)
  const ddf = (x: number) => 0.2 - 0.5 * Math.sin(0.5 * x + 4)
  const [x0, setX0] = createSignal(4)
  const next = (x: number) => x - df(x) / ddf(x)
  const x = createProjection<[number, ...number[]]>(() => {
    const result = [x0()] as [number, ...number[]]
    let last = x0()
    let count = 0
    while (Math.abs(df(last)) > 0.05 && count < 7) {
      last = next(last)
      result.push(last)
      count++
    }
    return result
  }, [x0()])
  return (
    <Board>
      <Board.Axis from={[0, 0]} to={[0, 1]} ticks={{ visible: false }} name="y" withLabel />
      <Board.Axis from={[0, 0]} to={[1, 0]} name="x" ticks={{ visible: false }} withLabel />
      <Board.Plot fn={df} strokeColor="lightblue" withLabel name="f'" strokeWidth={2} />
      <Repeat count={x.length}>
        {(i) => (
          <>
            <Board.Point name={`x_{${i}}`} position={[x[i]!, 0]} fixed color="black" size={1} />
            <Show when={i < x.length - 1}>
              <Board.Arrow
                from={[x[i]!, 0]}
                to={[x[i]!, df(x[i]!)]}
                fixed
                strokeColor="green"
                strokeWidth={1.5}
              />
              <Board.Arrow
                from={[x[i]!, df(x[i]!)]}
                to={[next(x[i]!), 0]}
                fixed
                strokeColor="green"
                strokeWidth={1.5}
              />
            </Show>
          </>
        )}
      </Repeat>
      <Board.Plot fn={fn} strokeWidth={4} name="f" withLabel>
        {(curve) => (
          <Board.Glider
            on={curve}
            position={[x0(), fn(x0())]}
            name="P"
            onDrag={(P) => setX0(P.X())}
          />
        )}
      </Board.Plot>
      <Board.Segment
        from={[x[x.length - 1]!, 0]}
        to={[x[x.length - 1]!, fn(x[x.length - 1]!)]}
        fixed
        dash={1}
        color="lightgray"
      />
      <Board.Point
        position={[x[x.length - 1]!, fn(x[x.length - 1]!)]}
        name="\text{minimum estimé}"
        fixed
      />
    </Board>
  )
}

const Optimisation = createDerivedStep(
  PythonCode,
  {
    f: 'expr',
    error: 'expr',
    method: v.optional(v.union([v.literal('newton'), v.literal('gradient')]), 'newton'),
  },
  (props) => ({
    math: true,
    prompt: (
      <>
        <p>
          À l'aide de la{' '}
          {props.method === 'newton' ? 'méthode de Newton-Raphson' : 'descente de gradient'},
          trouvez une approximation du minimum de la fonction {tex.display`f(x) = ${props.f}`} Comme
          condition d'arrêt, utilisez {tex`|f'(x)| \leq ${props.error}`}.
        </p>
      </>
    ),
    tests: (expect) => ({
      "La condition d'arrêt est respectée": expect
        .result()
        .toSatisfy((x) => props.f.diff('x', x).abs().leq(props.error)),
      'Le code emploie une boucle while': expect.code.toMatch(/while/),
      'Le code emploie la dérivée première': expect.code.toMatch(/epsilon/),
      'Le code emploie .dual pour dériver': expect.code.toMatch(/\.dual/),
      ...(props.method === 'newton'
        ? {
            'Le code emploie la dérivée seconde': expect.code.toMatch(/delta/),
          }
        : {
            "Le code n'emploie pas la dérivée seconde": expect.code.not.toMatch(/delta/),
          }),
    }),
  }),
)

export const NewtonRaphsonSequence = () => {
  return (
    <Sequence id="newton-raphson-sequence">
      <Optimisation method="newton" f="x^2 - 6x + 13" error="10^{-7}" />
      <Optimisation method="newton" f="x^2 + e^{-x}" error="10^{-5}" />
      <Optimisation method="newton" f="e^x - 3x" error="10^{-5}" />
      <Optimisation method="newton" f="x^2 + \sqrt{1 + x^2} + 0.8x" error="10^{-6}" />
      <Optimisation method="newton" f="x^2 + \ln{(1 + e^{-2x})}" error="10^{-6}" />
    </Sequence>
  )
}

export function GradientDescentAnimation() {
  const fn = (x: number) => x ** 2 - 4
  const df = (x: number) => 2 * x
  const [x0, setX0] = createSignal(2.5)
  const [n, setN] = createSignal(2)
  const [eta, setEta] = createSignal(0.3)
  createEffect(
    () => eta(),
    () => {
      setN(1)
    },
  )
  const x = createProjection<[number, ...number[]]>(() => {
    const result = [x0()] as [number, ...number[]]
    let last = x0()
    while (result.length <= n()) {
      last = last - df(last) * eta()
      result.push(last)
    }
    return result
  }, [x0()])
  return (
    <>
      <hgroup class="text-center">
        <h3 class="mb-0 text-xl font-bold">Descente de gradient</h3>
        <h5 class="text-gray-500">{tex`x_{n + 1} = x_n - \eta f'(x_n)`}</h5>
      </hgroup>
      <Board>
        <Board.Axis from={[0, 0]} to={[0, 1]} ticks={{ visible: false }} />
        <Board.Axis from={[0, 0]} to={[1, 0]} ticks={{ visible: false }} />
        <Board.Plot fn={fn}>
          {(curve) => (
            <Board.Glider
              on={curve}
              position={[x0(), fn(x0())]}
              name="P"
              onDrag={(P) => setX0(P.X())}
            />
          )}
        </Board.Plot>
        <For each={x}>
          {(t, i) => (
            <>
              <Board.Segment
                from={[t, 0]}
                to={[t, fn(t)]}
                fixed
                dash={1}
                color="gray"
                opacity={i() === x.length - 1 ? 1 : 0.3}
              />
              <Board.Point
                position={[t, 0]}
                name={`x_{${i()}}`}
                withLabel={i() === x.length - 1}
                fixed={i() === 0}
                onDrag={(P) => {
                  if (i() === 0) setX0(P.X())
                }}
                opacity={i() === x.length - 1 ? 1 : 0.3}
              />
              <Board.Plot
                fn={(s) => df(t) * (s - t) + fn(t)}
                domain={[t - 0.1, t + 0.1]}
                color={i() === x.length - 1 ? 'darkgreen' : 'black'}
                strokeWidth={3}
                opacity={i() === x.length - 1 ? 1 : 0.3}
              />
            </>
          )}
        </For>
      </Board>
      <div class="flex items-center justify-center gap-8">
        <label>
          {tex`n`}:
          <input
            class="mx-4 rounded-xl border border-gray-400 px-4"
            type="number"
            value={n()}
            onInput={(e) => {
              try {
                setN(Number(e.target.value))
              } catch {}
            }}
            min={1}
            step={1}
          />
        </label>
        <label>
          {tex`\eta`}:
          <input
            class="mx-4 rounded-xl border border-gray-400 px-4"
            type="range"
            value={eta()}
            onInput={(e) => {
              try {
                setEta(Number(e.target.value))
              } catch {}
            }}
            min={0.1}
            max={0.9}
            step={0.05}
          />
          {tex`${eta()}`}
        </label>
      </div>
    </>
  )
}

export const GradientDescentSequence = () => {
  return (
    <Sequence id="gradient-descent-sequence">
      <Optimisation method="gradient" f="x^2 - 6x + 13" error="10^{-7}" />
      <Optimisation method="gradient" f="x^2 + e^{-x}" error="10^{-5}" />
      <Optimisation method="gradient" f="e^x - 3x" error="10^{-5}" />
      <Optimisation method="gradient" f="x^2 + \sqrt{1 + x^2} + 0.8x" error="10^{-6}" />
      <Optimisation method="gradient" f="x^2 + \ln{(1 + e^{-2x})}" error="10^{-6}" />
    </Sequence>
  )
}

export const MaclaurinAnimation = () => {
  const [n, _setN] = createSignal(5)
  function setN(n: number) {
    document.startViewTransition(() => {
      _setN(n)
    })
  }
  const factorial = (x: number): number => (x === 0 ? 1 : x * factorial(x - 1))
  const taylor = (n: number) => (x: number) =>
    range(n).reduce(
      (sum, i) => sum + ((i % 2 === 0 ? 0 : i % 4 === 1 ? 1 : -1) / factorial(i)) * x ** i,
      0,
    )
  return (
    <>
      <hgroup class="text-center">
        <h3>
          Approximation de {tex`\sin x`} d'ordre{' '}
          <label>
            <input
              class="min-w-4 rounded-lg border border-gray-400 px-4 py-1"
              type="number"
              min="0"
              value={n()}
              onInput={(e) => setN(Number(e.target.value))}
            />
          </label>
        </h3>
        <h5>{tex.display`P_{${n()}}(x) = ${expr('\\sin x').taylor('x', 0, n()).expand()}`}</h5>
      </hgroup>
      <Board>
        <Board.Axis from={[0, 0]} to={[1, 0]} ticks={{ visible: false }} />
        <Board.Axis from={[0, 0]} to={[0, 1]} ticks={{ visible: false }} />
        <Board.Plot fn={(x) => Math.sin(x)} fixed />
        <Board.Plot fn={taylor(n())} strokeColor="darkgreen" strokeWidth={3} fixed />
      </Board>
    </>
  )
}

const Maclaurin = createDerivedStep(
  PythonCode,
  { f: 'expr', N: v.array(v.number()), I: v.tuple([v.number(), v.number()]) },
  (props) => ({
    math: true,
    prompt: (
      <>
        <p>Sur l'intervalle {tex`[${props.I[0]}, ${props.I[1]}]`}, tracez les graphes suivants:</p>
        <ul class="list-inside list-disc">
          <li>{tex`f(x) = ${props.f}`}</li>
          <For each={props.N}>
            {(m) => (
              <li>
                Le polynôme de MacLaurin d'ordre {m} associé à {tex`f(x)`}
              </li>
            )}
          </For>
        </ul>
        <p>Nommez les axes</p>
      </>
    ),
    tests: (expect) => ({
      "L'axe x est nommé": expect.matplotlib.xLabel().toMatch(/x/),
      "L'axe y est nommé": expect.matplotlib.yLabel().toMatch(/y/),
      'Le code emploie la fonction sum': expect.code.toMatch(/sum\(/),
      'Le code emploie des nombres duaux': expect.code.toMatch(/eps\(/),
      'Le code utilise la factorielle': expect.code.toMatch(/factorial\(/),
      'Le graphe de f est tracé': expect.matplotlib.plot(props.f, props.I[0], props.I[1]),
      ...Object.fromEntries(
        props.N.map((m) => [
          "Le polynôme de MacLaurin d'ordre " + m + ' est tracé',
          expect.matplotlib.plot(props.f.taylor('x', 0, m).simplify(), props.I[0], props.I[1]),
        ]),
      ),
    }),
  }),
)

export const MaclaurinSequence = () => {
  return (
    <Sequence id="maclaurin-sequence">
      <Maclaurin f="\cos x" N={[2, 4]} I={[-3, 3]} />
      <Maclaurin f="e^x" N={[3, 5]} I={[-4, 4]} />
      <Maclaurin f="\frac{1}{2 + e^{x}}" N={[4, 7]} I={[-3, 3]} />
    </Sequence>
  )
}
