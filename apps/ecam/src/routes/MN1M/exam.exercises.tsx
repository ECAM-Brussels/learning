import { Highlight } from '@learning/components'
import { createDerivedStep, Sequence, tex } from '@learning/core'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import type { JSX } from '@solidjs/web'
import { randomInt, range, round, sample, sumBy, uniq, without } from 'es-toolkit'
import * as v from 'valibot'

type Params = Record<string, number>

type Question = {
  prompt: JSX.Element
  answer: string
  choices: Record<string, JSX.Element>
}

type Generator = {
  session: Session
  generate: () => Params
  render: (p: Params) => Question
}

export type Session = 1 | 2 | 3 | 4 | 5 | 6

const question = <P extends Params>(g: {
  session: Session
  generate: () => P
  render: (p: P) => Question
}) => g as unknown as Generator

// Rounds away binary noise such as 1.5999999999999999, so that keys stay stable.
const fmt = (x: number) => String(round(x, 10))

const nonZero = (min: number, max: number) => sample(without(range(min, max + 1), 0))

const list = (xs: number[]) => `[${xs.map(fmt).join(', ')}]`

function numbers(answer: number, distractors: number[]) {
  return texChoices(fmt(answer), distractors.map(fmt))
}

function texChoices(answer: string, distractors: string[]) {
  return choices(answer, distractors, (key) => tex`${key}`)
}

function codeChoices(answer: string, distractors: string[]) {
  return choices(answer, distractors, (key) => (key === 'Une erreur' ? key : <code>{key}</code>))
}

function choices(answer: string, distractors: string[], display: (key: string) => JSX.Element) {
  const keys = uniq([answer, ...distractors]).slice(0, 4)
  return { answer, choices: Object.fromEntries(keys.map((key) => [key, display(key)])) }
}

const dual = (real: number, eps: number, symbol = '\\epsilon') =>
  `${fmt(real)} ${eps < 0 ? '-' : '+'} ${fmt(Math.abs(eps))} ${symbol}`

const generators = {
  'exact-binary': question({
    session: 1,
    generate: () => ({
      numerator: sample([1, 3, 5, 7]),
      power: randomInt(1, 4),
      seed: randomInt(0, 6),
    }),
    render: ({ numerator, power, seed }) => {
      const inexact = ['0.1', '0.2', '0.3', '0.6', '0.7', '0.9']
      return {
        prompt: <p>Lequel de ces nombres est représentable exactement en binaire ?</p>,
        ...texChoices(
          fmt((numerator % 2 ** power) / 2 ** power),
          [...inexact.slice(seed), ...inexact.slice(0, seed)].filter((_, i) => i % 2 === 0),
        ),
      }
    },
  }),
  'vector-power': question({
    session: 1,
    generate: () => ({
      a: randomInt(1, 5),
      b: randomInt(1, 5),
      c: randomInt(1, 5),
      k: sample([2, 3]),
    }),
    render: ({ a, b, c, k }) => ({
      prompt: (
        <p>
          Que vaut{' '}
          <code>
            np.array({list([a, b, c])}) ** {k}
          </code>
           ?
        </p>
      ),
      ...codeChoices(`array(${list([a ** k, b ** k, c ** k])})`, [
        `array(${list([a * k, b * k, c * k])})`,
        fmt(a ** k + b ** k + c ** k),
        'Une erreur',
      ]),
    }),
  }),
  norm: question({
    session: 1,
    generate: () => {
      const [a, b] = sample([
        [3, 4],
        [6, 8],
        [5, 12],
        [8, 15],
      ])
      return { a, b }
    },
    render: ({ a, b }) => ({
      prompt: (
        <p>
          Que vaut <code>np.linalg.norm({list([a, b])})</code> ?
        </p>
      ),
      ...numbers(Math.hypot(a, b), [a + b, a ** 2 + b ** 2, Math.abs(b - a)]),
    }),
  }),
  linspace: question({
    session: 2,
    generate: () => ({
      start: randomInt(0, 3),
      step: sample([0.25, 0.5, 1, 2]),
      n: randomInt(3, 6),
    }),
    render: ({ start, step, n }) => {
      const stop = start + step * (n - 1)
      const points = (count: number, dx: number) => range(count).map((i) => start + i * dx)
      return {
        prompt: (
          <p>
            Que vaut <code>np.linspace({`${start}, ${fmt(stop)}, ${n}`})</code> ?
          </p>
        ),
        ...codeChoices(list(points(n, step)), [
          list(points(n, (stop - start) / n)),
          list(points(n - 1, step)),
          list(points(n, step).map((x) => x + step)),
        ]),
      }
    },
  }),
  'missing-return': question({
    session: 2,
    generate: () => ({
      a: randomInt(2, 6),
      b: randomInt(1, 6),
      x: randomInt(1, 5),
      returns: randomInt(0, 2),
    }),
    render: ({ a, b, x, returns }) => {
      const value = a * x + b
      return {
        prompt: (
          <>
            <p>Quel est le résultat du programme suivant ?</p>
            <Highlight
              lang="python"
              code={`def f(x):\n    ${returns ? 'return ' : ''}${a} * x + ${b}\n\nf(${x})`}
            />
          </>
        ),
        ...codeChoices(returns ? fmt(value) : 'None', [
          returns ? 'None' : fmt(value),
          fmt(a * (x + b)),
          'Une erreur',
        ]),
      }
    },
  }),
  segments: question({
    session: 2,
    generate: () => ({ n: randomInt(3, 8) }),
    render: ({ n }) => ({
      prompt: (
        <p>
          Combien de segments de droite sont tracés par <code>plt.plot(x, y)</code> si{' '}
          <code>x</code> et <code>y</code> contiennent {tex`${n}`} valeurs ?
        </p>
      ),
      ...numbers(n - 1, [n, n + 1, n - 2]),
    }),
  }),
  secant: question({
    session: 3,
    generate: () => {
      const a = randomInt(-3, 4)
      return { a, b: a + randomInt(1, 4) }
    },
    render: ({ a, b }) => ({
      prompt: (
        <p>
          Que vaut la pente de la sécante à {tex`f(x) = x^2`} en {tex`x = ${a}`} et {tex`x = ${b}`}
           ?
        </p>
      ),
      ...numbers(a + b, [b ** 2 - a ** 2, (a + b) / 2, 2 * b, b - a, a ** 2 + b ** 2, 2 * a]),
    }),
  }),
  'difference-quotient': question({
    session: 3,
    generate: () => ({ a: randomInt(1, 5), h: sample([0.1, 0.5, 1]), central: randomInt(0, 2) }),
    render: ({ a, h, central }) => ({
      prompt: (
        <p>
          Pour {tex`f(x) = x^2`}, {tex`a = ${a}`} et {tex`h = ${h}`}, que vaut le quotient
          différentiel {central ? 'central' : 'avant'}{' '}
          {central
            ? tex`\displaystyle \frac{f(a+h) - f(a-h)}{2h}`
            : tex`\displaystyle \frac{f(a+h) - f(a)}{h}`}
           ?
        </p>
      ),
      ...numbers(central ? 2 * a : 2 * a + h, [
        central ? 2 * a + h : 2 * a,
        2 * a - h,
        2 * a + 2 * h,
        a ** 2,
      ]),
    }),
  }),
  'dual-product': question({
    session: 4,
    generate: () => ({
      a: randomInt(1, 5),
      b: nonZero(-3, 3),
      c: randomInt(1, 5),
      d: nonZero(-3, 3),
    }),
    render: ({ a, b, c, d }) => ({
      prompt: <p>Que vaut {tex`(${dual(a, b)})(${dual(c, d)})`} après simplification ?</p>,
      ...texChoices(dual(a * c, a * d + b * c), [
        dual(a * c, b * d),
        dual(a * c, a * d - b * c),
        dual(a * c + b * d, a * d + b * c),
      ]),
    }),
  }),
  tangent: question({
    session: 4,
    generate: () => ({ a: randomInt(1, 4), value: randomInt(1, 10), slope: nonZero(-9, 9) }),
    render: ({ a, value, slope }) => ({
      prompt: (
        <p>
          Le code <code>f({a} + epsilon)</code> affiche <code>{dual(value, slope, 'ε')}</code>.
          Quelle est l'équation de la tangente au graphe de {tex`f`} en {tex`x = ${a}`} ?
        </p>
      ),
      ...texChoices(`y = ${slope}(x - ${a}) + ${value}`, [
        `y = ${value}(x - ${a}) + ${slope}`,
        `y = ${slope}x + ${value}`,
        `y = ${slope}(x + ${a}) + ${value}`,
      ]),
    }),
  }),
  'newton-root': question({
    session: 4,
    generate: () => ({ x0: sample([1, 2, 4]), c: sample([2, 3, 5, 6, 7]) }),
    render: ({ x0, c }) => {
      const step = (x0 ** 2 - c) / (2 * x0)
      return {
        prompt: (
          <p>
            En appliquant une itération de Newton-Raphson à {tex`f(x) = x^2 - ${c}`} en partant de{' '}
            {tex`x_0 = ${x0}`}, que vaut {tex`x_1`} ?
          </p>
        ),
        ...numbers(x0 - step, [x0 + step, x0 - 2 * step, x0 - (x0 ** 2 - c)]),
      }
    },
  }),
  'second-derivative-dual': question({
    session: 5,
    generate: () => ({ a: randomInt(1, 3), n: randomInt(2, 5) }),
    render: ({ a, n }) => ({
      prompt: (
        <p>
          Sachant que {tex`\epsilon^2 = \delta^2 = 0`}, que vaut le coefficient de{' '}
          {tex`\epsilon\delta`} dans {tex`(${a} + \epsilon + \delta)^${n}`} ?
        </p>
      ),
      ...numbers(n * (n - 1) * a ** (n - 2), [
        n * a ** (n - 1),
        (n * (n - 1) * a ** (n - 2)) / 2,
        a ** n,
        n * (n + 1) * a ** (n - 2),
      ]),
    }),
  }),
  'newton-minimum': question({
    session: 5,
    generate: () => ({
      a: sample([1, 2]),
      b: nonZero(-6, 6),
      c: randomInt(0, 6),
      x0: randomInt(-2, 3),
    }),
    render: ({ a, b, c, x0 }) => ({
      prompt: (
        <p>
          En appliquant une itération de Newton-Raphson pour minimiser{' '}
          {tex`f(x) = ${a === 1 ? '' : a}x^2 ${b < 0 ? '-' : '+'} ${Math.abs(b)}x + ${c}`} en
          partant de {tex`x_0 = ${x0}`}, que vaut {tex`x_1`} ?
        </p>
      ),
      ...numbers(-b / (2 * a), [-b / a, b / (2 * a), x0 - (2 * a * x0 + b)]),
    }),
  }),
  'gradient-descent': question({
    session: 5,
    generate: () => ({ a: sample([1, 2]), x0: nonZero(-3, 3), eta: sample([0.1, 0.25]) }),
    render: ({ a, x0, eta }) => ({
      prompt: (
        <p>
          En appliquant une itération de la descente de gradient à{' '}
          {tex`f(x) = ${a === 1 ? '' : a}x^2`} avec {tex`x_0 = ${x0}`} et {tex`\eta = ${eta}`}, que
          vaut {tex`x_1`} ?
        </p>
      ),
      ...numbers(x0 - eta * 2 * a * x0, [
        x0 + eta * 2 * a * x0,
        x0 - eta * a * x0,
        x0 - 2 * a * x0,
      ]),
    }),
  }),
  'gradient-direction': question({
    session: 5,
    generate: () => ({ positive: randomInt(0, 2) }),
    render: ({ positive }) => ({
      prompt: (
        <p>
          Lors d'une descente de gradient, si {tex`f'(x_n) ${positive ? '>' : '<'} 0`}, où se situe{' '}
          {tex`x_{n+1}`} par rapport à {tex`x_n`} ?
        </p>
      ),
      ...choices(positive ? 'left' : 'right', [positive ? 'right' : 'left', 'same'], (key) =>
        key === 'left' ? 'À gauche' : key === 'right' ? 'À droite' : 'Au même endroit',
      ),
    }),
  }),
  midpoints: question({
    session: 6,
    generate: () => ({ a: randomInt(0, 3), dx: sample([0.5, 1, 2]), n: randomInt(2, 5) }),
    render: ({ a, dx, n }) => {
      const left = range(n).map((i) => a + i * dx)
      return {
        prompt: (
          <p>
            Quels sont les points milieux d'une partition de {tex`[${a}, ${fmt(a + n * dx)}]`} en{' '}
            {tex`${n}`} sous-intervalles ?
          </p>
        ),
        ...codeChoices(list(left.map((x) => x + dx / 2)), [
          list(left),
          list(left.map((x) => x + dx)),
          list(left.map((x) => x + dx / n)),
        ]),
      }
    },
  }),
  'integration-rule': question({
    session: 6,
    generate: () => ({ b: sample([2, 4]), n: randomInt(1, 3), trapezoid: randomInt(0, 2) }),
    render: ({ b, n, trapezoid }) => {
      const dx = b / n
      const f = (x: number) => x ** 2
      const left = range(n).map((i) => i * dx)
      const sum = (g: (x: number) => number) => sumBy(left, (x) => g(x) * dx)
      const midpoint = sum((x) => f(x + dx / 2))
      const trapezes = sum((x) => (f(x) + f(x + dx)) / 2)
      return {
        prompt: (
          <p>
            Avec la {trapezoid ? 'règle des trapèzes' : 'méthode du point milieu'} et {tex`${n}`}{' '}
            sous-intervalle{n > 1 ? 's' : ''}, que vaut l'approximation de{' '}
            {tex`\int_0^${b} x^2 \, \mathrm{d}x`} ?
          </p>
        ),
        ...numbers(trapezoid ? trapezes : midpoint, [
          trapezoid ? midpoint : trapezes,
          sum(f),
          sum((x) => f(x + dx)),
        ]),
      }
    },
  }),
  'integration-code': question({
    session: 6,
    generate: () => ({ method: randomInt(0, 3) }),
    render: ({ method }) => {
      const code = [
        'f(x + dx / 2)',
        '(f(x) + f(x + dx)) / 2',
        '(f(x) + 4 * f(x + dx / 2) + f(x + dx)) / 6',
      ][method]
      return {
        prompt: (
          <>
            <p>Quelle méthode d'intégration est utilisée dans le code suivant ?</p>
            <Highlight
              lang="python"
              code={`x, dx = np.linspace(a, b, n, endpoint=False, retstep=True)\ny = ${code}\nnp.sum(y * dx)`}
            />
          </>
        ),
        ...choices(
          String(method),
          ['0', '1', '2'],
          (key) => ['Règle du point milieu', 'Règle des trapèzes', 'Règle de Simpson'][Number(key)],
        ),
      }
    },
  }),
} satisfies Record<string, Generator>

type Kind = keyof typeof generators
const kinds = Object.keys(generators) as [Kind, ...Kind[]]

// Deterministic shuffle: a reloaded question must keep its choices in the same order.
function shuffle(keys: string[], seed: string) {
  const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)
  return [...keys].sort((a, b) => hash(seed + a) - hash(seed + b))
}

const GeneratedQuestion = createDerivedStep(
  MultipleChoice,
  { kind: v.picklist(kinds), params: v.record(v.string(), v.number()) },
  ({ kind, params }) => {
    const { prompt, answer, choices } = generators[kind].render(params)
    const order = shuffle(Object.keys(choices), JSON.stringify({ kind, params }))
    return {
      prompt,
      choices: Object.fromEntries(order.map((key) => [key, choices[key]])),
      grade: (sel) => sel.equals([answer]),
    }
  },
)

export function Practice(props: { id: string; sessions?: Session[] }) {
  const available = () =>
    kinds.filter((kind) => !props.sessions || props.sessions.includes(generators[kind].session))
  return (
    <Sequence
      id={props.id}
      options={{ allowResubmissions: false }}
      exercise={GeneratedQuestion}
      next={() => ({
        data: () => {
          const kind = sample(available())
          return { kind, params: generators[kind].generate() }
        },
      })}
    />
  )
}

export const MockExam = () => (
  <Sequence id="mn1m-mock-exam" options={{ allowResubmissions: false }}>
    <MultipleChoice
      prompt={
        <p>
          Quel est le résultat de <code>1e16 + 1 - 1e16</code> ?
        </p>
      }
      choices={{
        A: <code>1.0</code>,
        B: <code>0.0</code>,
        C: <code>-1.0</code>,
        D: <code>1e16</code>,
      }}
      grade={(sel) => sel.equals(['B'])}
    />
    <MultipleChoice
      prompt={<p>Lequel de ces nombres est représentable exactement en binaire ?</p>}
      choices={{ A: tex`0.1`, B: tex`0.3`, C: tex`\frac 1 3`, D: tex`0.375` }}
      grade={(sel) => sel.equals(['D'])}
    />
    <MultipleChoice
      prompt={
        <>
          <p>Quel est le résultat du code suivant ?</p>
          <Highlight lang="python" code={`import numpy as np\n\nx = np.array([1, 2, 3])\nx ** 2`} />
        </>
      }
      choices={{
        A: <code>array([1, 4, 9])</code>,
        B: <code>14</code>,
        C: <code>array([2, 4, 6])</code>,
        D: 'Une erreur',
      }}
      grade={(sel) => sel.equals(['A'])}
    />
    <MultipleChoice
      prompt={
        <p>
          Quel est le résultat de <code>np.linspace(0, 1, 5)</code> ?
        </p>
      }
      choices={{
        A: <code>[0, 0.2, 0.4, 0.6, 0.8]</code>,
        B: <code>[0.2, 0.4, 0.6, 0.8, 1]</code>,
        C: <code>[0, 0.25, 0.5, 0.75, 1]</code>,
        D: <code>[0, 1, 2, 3, 4]</code>,
      }}
      grade={(sel) => sel.equals(['C'])}
    />
    <MultipleChoice
      prompt={
        <>
          <p>Quel est le résultat du programme suivant ?</p>
          <Highlight lang="python" code={`def f(x):\n    x ** 2\n\nf(3)`} />
        </>
      }
      choices={{ A: <code>9</code>, B: <code>None</code>, C: 'Une erreur' }}
      grade={(sel) => sel.equals(['B'])}
    />
    <MultipleChoice
      prompt={
        <p>
          Combien de segments de droite sont tracés par <code>plt.plot([0, 1, 2], [1, 3, 2])</code>
           ?
        </p>
      }
      choices={{ A: tex`1`, B: tex`2`, C: tex`3`, D: 'Une infinité' }}
      grade={(sel) => sel.equals(['B'])}
    />
    <MultipleChoice
      prompt={
        <p>
          Que vaut la pente de la sécante à {tex`f(x) = x^2`} en {tex`x = 1`} et {tex`x = 3`} ?
        </p>
      }
      choices={{ A: tex`2`, B: tex`4`, C: tex`8`, D: tex`6` }}
      grade={(sel) => sel.equals(['B'])}
    />
    <MultipleChoice
      prompt={
        <p>
          Pour {tex`f(x) = x^2`}, {tex`a = 1`} et {tex`h = 0.1`}, que vaut le quotient différentiel
          central {tex`\displaystyle \frac{f(a+h) - f(a-h)}{2h}`} ?
        </p>
      }
      choices={{ A: tex`2.1`, B: tex`1.9`, C: tex`2.01`, D: tex`2` }}
      grade={(sel) => sel.equals(['D'])}
    />
    <MultipleChoice
      prompt={
        <>
          <p>Quel est le résultat du programme suivant ?</p>
          <Highlight
            lang="python"
            code={`def f(x):\n    return x**2\n\na = 1\nh = 1e-20\n(f(a + h) - f(a)) / h`}
          />
        </>
      }
      choices={{ A: <code>2.0</code>, B: <code>1.0</code>, C: <code>0.0</code>, D: 'Une erreur' }}
      grade={(sel) => sel.equals(['C'])}
    />
    <MultipleChoice
      prompt={
        <p>
          Pour approximer {tex`f'(1)`} avec un quotient différentiel avant, quel pas {tex`h`} donne
          le meilleur résultat ?
        </p>
      }
      choices={{ A: tex`1`, B: tex`10^{-6}`, C: tex`10^{-20}`, D: tex`10^{-30}` }}
      grade={(sel) => sel.equals(['B'])}
    />
    <MultipleChoice
      prompt={<p>Que vaut {tex`(3 + 2 \epsilon) (1 - \epsilon)`} après simplification ?</p>}
      choices={{
        A: tex`3 + 5 \epsilon`,
        B: tex`3 - \epsilon`,
        C: tex`3 - \epsilon - 2 \epsilon^2`,
        D: tex`3 + \epsilon`,
      }}
      grade={(sel) => sel.equals(['B'])}
    />
    <MultipleChoice
      prompt={<p>Que vaut {tex`\sin(3 + 4 \epsilon)`} ?</p>}
      choices={{
        A: tex`\sin 3 + 4 \cos 3 \, \epsilon`,
        B: tex`\sin 3 + \cos 3 \, \epsilon`,
        C: tex`\sin 3 + 4 \sin 3 \, \epsilon`,
      }}
      grade={(sel) => sel.equals(['A'])}
    />
    <MultipleChoice
      prompt={
        <p>
          Le code <code>f(2 + epsilon)</code> affiche <code>7 + 15ε</code>. Quelle est l'équation de
          la tangente au graphe de {tex`f`} en {tex`x = 2`} ?
        </p>
      }
      choices={{
        A: tex`y = 7(x - 2) + 15`,
        B: tex`y = 15x + 7`,
        C: tex`y = 15(x - 2) + 7`,
        D: tex`y = 7x + 15`,
      }}
      grade={(sel) => sel.equals(['C'])}
    />
    <MultipleChoice
      prompt={
        <p>
          En appliquant une itération de Newton-Raphson à {tex`f(x) = x^2 - 3`} en partant de{' '}
          {tex`x_0 = 2`}, que vaut {tex`x_1`} ?
        </p>
      }
      choices={{ A: tex`1.5`, B: tex`1.75`, C: tex`2.25`, D: tex`1` }}
      grade={(sel) => sel.equals(['B'])}
    />
    <MultipleChoice
      prompt={
        <p>
          Sachant que {tex`\epsilon^2 = \delta^2 = 0`}, que vaut le coefficient de{' '}
          {tex`\epsilon\delta`} dans {tex`(1 + \epsilon + \delta)^3`} ?
        </p>
      }
      choices={{ A: tex`3`, B: tex`1`, C: tex`0`, D: tex`6` }}
      grade={(sel) => sel.equals(['D'])}
    />
    <MultipleChoice
      prompt={
        <p>
          En appliquant une itération de Newton-Raphson pour minimiser {tex`f(x) = x^2 + 3x + 5`} en
          partant de {tex`x_0 = 0`}, que vaut {tex`x_1`} ?
        </p>
      }
      choices={{ A: tex`-3`, B: tex`-\frac 5 3`, C: tex`-1.5`, D: tex`1.5` }}
      grade={(sel) => sel.equals(['C'])}
    />
    <MultipleChoice
      prompt={
        <p>
          En appliquant une itération de la descente de gradient à {tex`f(x) = x^2`} avec{' '}
          {tex`x_0 = 2`} et {tex`\eta = 0.1`}, que vaut {tex`x_1`} ?
        </p>
      }
      choices={{ A: tex`1.8`, B: tex`2.4`, C: tex`1.6`, D: tex`0` }}
      grade={(sel) => sel.equals(['C'])}
    />
    <MultipleChoice
      prompt={
        <p>
          Quels sont les points milieux d'une partition de {tex`[0, 1]`} en {tex`2`}{' '}
          sous-intervalles ?
        </p>
      }
      choices={{
        A: tex`0 \text{ et } 0.5`,
        B: tex`0.5 \text{ et } 1`,
        C: tex`0.25 \text{ et } 0.75`,
        D: tex`0.5`,
      }}
      grade={(sel) => sel.equals(['C'])}
    />
    <MultipleChoice
      prompt={
        <p>
          Avec la méthode du point milieu et {tex`2`} sous-intervalles, que vaut l'approximation de{' '}
          {tex`\int_0^2 x^2 \, \mathrm{d}x`} ?
        </p>
      }
      choices={{ A: tex`2.5`, B: tex`\frac 8 3`, C: tex`2`, D: tex`4` }}
      grade={(sel) => sel.equals(['A'])}
    />
    <MultipleChoice
      prompt={
        <p>
          Avec la règle des trapèzes et {tex`1`} seul sous-intervalle, que vaut l'approximation de{' '}
          {tex`\int_0^2 x^2 \, \mathrm{d}x`} ?
        </p>
      }
      choices={{ A: tex`2`, B: tex`4`, C: tex`8`, D: tex`\frac 8 3` }}
      grade={(sel) => sel.equals(['B'])}
    />
  </Sequence>
)
