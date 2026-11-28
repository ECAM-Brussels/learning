import { Attempt, Boundary, CheckMark, Highlight, Question } from '@learning/components'
import { createDerivedStep, Exercise, expr, omitFromJSON, Sequence, tex } from '@learning/core'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import { PythonCode } from '@learning/exercises/python/Code'
import { type JSX } from '@solidjs/web'
import { dedent } from 'es-toolkit'
import { createMemo, createSignal, For, merge, Show } from 'solid-js'
import * as v from 'valibot'

export function Integer(rawProps: {
  mode?: 'decimal' | 'base' | 'both'
  base?: 2 | 10
  value?: number
  showCalculation?: boolean
  precision?: number
}) {
  const props = merge({ mode: 'both', base: 2, value: 0, precision: 5 }, rawProps)
  const [number, setNumber] = createSignal(() => props.value)
  const [precision, setPrecision] = createSignal(() => props.precision)

  const bits = createMemo(() => {
    const bits: Record<number, number> = {}
    const rep = number().toString(props.base)
    let power = rep.indexOf('.') >= 0 ? rep.indexOf('.') - 1 : rep.length - 1
    if (!rep.startsWith('0')) bits[power + 1] = 0
    for (const char of rep) {
      if (char === '.') continue
      bits[power--] = parseInt(char, props.base)
    }
    return bits
  })

  function changeBit(index: number, value: number) {
    const newBits = { ...bits() }
    newBits[index] = value
    setNumber(fromEntries(Object.entries(newBits)))
  }

  function fromEntries(entries: [string, number][]) {
    return entries.reduce(
      (sum, [exponent, digit]) => sum + digit * props.base ** Number(exponent),
      0,
    )
  }

  const entries = createMemo(() =>
    Object.entries(bits())
      .sort(([a], [b]) => Number(b) - Number(a))
      .filter(([power]) => Number(power) >= -precision()),
  )

  const isApprox = createMemo(() => number() !== fromEntries(entries()))

  return (
    <div class="not-prose m-4 rounded-xl p-4 shadow-sm">
      <div class="flex items-center gap-4">
        <h4 class="font-bold">Nombre:</h4>
        <input
          class="rounded-xl border border-gray-200 px-2 text-right"
          type="number"
          value={number()}
          onInput={(e) => setNumber(Number(e.target.value))}
          disabled={props.mode === 'base'}
        />
        <Show when={isApprox()}>
          <label>Précision</label>
          <input
            class="rounded-xl border border-gray-200 px-2 text-right"
            type="number"
            value={precision()}
            onInput={(e) => setPrecision(Number(e.target.value))}
          />
        </Show>
      </div>
      <div class="my-4">
        <h4 class="font-bold">
          Représentation en base {props.base}
          <Show when={props.base !== 10}>
            : <code>{number().toString(props.base)}</code>
          </Show>
        </h4>
        <table class="mx-auto rounded-lg">
          <tbody>
            <tr class="text-right text-xs text-gray-500">
              <td class="border border-gray-200 px-2">Rang</td>
              <For each={entries()}>
                {([i]) => <td class="border border-gray-200 px-2 text-center">{tex`${i}`}</td>}
              </For>
            </tr>
            <tr class="text-lg">
              <td class="border border-gray-200 px-2 text-right text-xs text-gray-500">
                {props.base !== 2 ? 'Chiffre' : 'Bit'}
              </td>
              <For each={entries()}>
                {([i]) => (
                  <td class="border border-gray-200 bg-blue-100 px-2 py-2 text-center">
                    <input
                      class="font-mono font-bold text-blue-950"
                      type="number"
                      onInput={(e) => changeBit(Number(i), Number(e.target.value))}
                      value={bits()[Number(i)] ?? 0}
                      max={props.base - 1}
                      min={0}
                      disabled={props.mode === 'decimal'}
                    />
                  </td>
                )}
              </For>
            </tr>
            <tr class="text-right text-xs text-gray-500">
              <td class="border border-gray-200 px-2">Poids</td>
              <For each={entries()}>
                {([i]) => (
                  <td class="border border-gray-200 p-2 text-center">{tex`${props.base}^{${i}}`}</td>
                )}
              </For>
            </tr>
          </tbody>
        </table>
      </div>
      <Show when={props.showCalculation}>
        {tex`${entries()
          .filter(([, b]) => b !== 0)
          .map(
            ([i, b]) =>
              `
                ${b}
                \\cdot
                \\underbrace{${props.base ** Number(i)}}_{${props.base}^{${i}}}
              `,
          )
          .join(' + ')}
          = ${fromEntries(entries())}
          ${isApprox() ? `\\approx ${number()}` : ''}
        `}
      </Show>
    </div>
  )
}

export function Print(props: {
  id?: string
  initialCode?: string
  message: string
  children?: JSX.Element
}) {
  return (
    <PythonCode
      id={props.id}
      prompt={
        props.children ?? (
          <p>
            Écrivez un programme Python qui affiche <code>{props.message}</code>
          </p>
        )
      }
      initialCode={props.initialCode}
      tests={(expect) => ({
        [`affiche "${props.message}"`]: expect
          .stdout()
          .toSatisfy((stdout) => stdout.toLowerCase().includes(props.message.toLowerCase())),
      })}
      feedback={(ctx) => {
        const [message, setMessage] = createSignal('message')
        return (
          <Show
            when={!ctx.correct}
            fallback={
              <p>
                Correct! <CheckMark value={true} />
              </p>
            }
          >
            <p>
              Malheureusement, la réponse est incorrecte. Pour afficher le message{' '}
              <input
                class="border p-1 font-mono"
                value={message()}
                onInput={(e) => setMessage(e.target.value)}
              />{' '}
              en Python, tapez:
            </p>
            <Highlight lang="python" code={`print('${message().replace("'", "\\'")}')`} />
            <p>
              Cliquez sur <em>Recommencer l'exercice</em> pour soumettre une nouvelle tentative.
            </p>
          </Show>
        )
      }}
    />
  )
}

/**
 * Exact decimal value of the double closest to `number`,
 * formatted like Python's `str(Decimal(number))`.
 *
 * Every finite double is `m * 2^e` with integer `m` and `e`.
 * When `e < 0`, this equals `m * 5^-e / 10^-e`, which has a finite decimal expansion.
 */
export function getRep(number: string | number) {
  const x = typeof number === 'number' ? number : parseFloat(number)
  if (!Number.isFinite(x)) return Number.isNaN(x) ? 'NaN' : x > 0 ? 'Infinity' : '-Infinity'
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, x)
  const bits = view.getBigUint64(0)
  const sign = bits >> 63n ? '-' : ''
  const biasedExponent = Number((bits >> 52n) & 0x7ffn)
  const fraction = bits & ((1n << 52n) - 1n)
  let mantissa = biasedExponent === 0 ? fraction : fraction | (1n << 52n)
  let exponent = (biasedExponent === 0 ? 1 : biasedExponent) - 1075
  if (mantissa === 0n) return `${sign}0`
  while (exponent < 0 && (mantissa & 1n) === 0n) {
    mantissa >>= 1n
    exponent++
  }
  // Decimal coefficient and exponent: value = digits * 10^exp10
  const digits =
    exponent >= 0
      ? (mantissa << BigInt(exponent)).toString()
      : (mantissa * 5n ** BigInt(-exponent)).toString()
  const exp10 = exponent >= 0 ? 0 : exponent
  // Python's Decimal.__str__: plain notation unless the number is very small
  const leftDigits = exp10 + digits.length
  const dotPlace = exp10 <= 0 && leftDigits > -6 ? leftDigits : 1
  let rep: string
  if (dotPlace <= 0) rep = `0.${'0'.repeat(-dotPlace)}${digits}`
  else if (dotPlace >= digits.length) rep = digits + '0'.repeat(dotPlace - digits.length)
  else rep = `${digits.slice(0, dotPlace)}.${digits.slice(dotPlace)}`
  const shownExponent = leftDigits - dotPlace
  return (
    sign + rep + (shownExponent !== 0 ? `E${shownExponent > 0 ? '+' : ''}${shownExponent}` : '')
  )
}

export const Calculator = createDerivedStep(
  PythonCode,
  {
    children: omitFromJSON(v.optional(v.custom<JSX.Element>(() => true))),
    prompt: v.string(),
    answer: v.union([v.number(), v.string()]),
    inexact: v.optional(v.array(v.string())),
    rounded: v.optional(v.boolean()),
  },
  (props) => ({
    prompt: props.children ?? <p>Utilisez Python pour calculer {tex`${props.prompt}`}</p>,
    tests: (expect) => ({
      // The very float Python computes, returned or printed: the exercise is about how floats are rounded.
      'Résultat final': expect.toShow(props.answer, 0),
    }),
  }),
  {
    children: (props) => (
      <Show when={props.data.inexact !== undefined || props.data.rounded}>
        <Exercise
          schema={{ data: {}, inputs: { attempt: 'expr' } }}
          data={{}}
          prompt={(ctx) => (
            <>
              <p>Quel aurait dû être le résultat?</p>
              <Attempt>
                {tex`${props.data.prompt} =`} {ctx.inputs.attempt}
              </Attempt>
            </>
          )}
          grade={(ctx) => ctx.inputs.attempt.isEqual(props.data.prompt)}
          feedback={(ctx) => {
            return (
              <>
                <Show when={!ctx.correct}>
                  <p>On vérifie que</p>
                  {tex`${props.data.prompt} = ${expr(props.data.prompt).simplify()}`}
                </Show>
                <Question>Pourquoi la réponse de Python est-elle incorrecte?</Question>
                <Show when={props.data.rounded}>
                  <p>
                    Pour les nombres <strong>non entiers</strong>, Python travaille avec une
                    précision d'environ <strong>15 chiffres significatifs</strong>.
                  </p>
                </Show>
                <Show when={props.data.inexact?.length}>
                  <p>
                    Puisque l'ordinateur utilise le <strong>binaire</strong>, certains des nombres
                    du code ont été remplacés par des <strong>approximations</strong>. Dans ce
                    cas-ci:
                  </p>
                  <table class="mx-auto my-4">
                    <thead>
                      <tr class="border-b border-gray-200">
                        <th class="px-4 text-right">Nombre entré</th>
                        <th class="px-4 text-left">
                          Nombre réellement utilisé par <code>Python</code>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <Boundary>
                        <For each={props.data.inexact}>
                          {(n) => (
                            <tr>
                              <td class="px-4 py-2">{tex`${n}`}</td>
                              <td class="px-4 py-2">
                                <code>{getRep(n)}</code>
                              </td>
                            </tr>
                          )}
                        </For>
                      </Boundary>
                    </tbody>
                  </table>
                  <p>
                    {props.data.inexact!.length > 0
                      ? 'Ces approximations se propagent'
                      : 'Cette approximation se propage'}{' '}
                    ensuite dans les calculs. Nous verrons cela plus en détail plus tard.
                  </p>
                </Show>
              </>
            )
          }}
        />
      </Show>
    ),
    feedback: (ctx) => (
      <Show
        when={!ctx.correct}
        fallback={
          <p>
            Correct! <CheckMark value={true} />
          </p>
        }
      >
        <p>
          La réponse est incorrecte. <CheckMark value={false} />
        </p>
      </Show>
    ),
  },
)

export const Variables = createDerivedStep(
  PythonCode,
  {
    answer: v.union([v.number(), v.string()]),
    calculate: omitFromJSON(v.custom<JSX.Element>(() => true)),
    vars: v.record(v.string(), v.number()),
  },
  (props) => ({
    prompt: (
      <>
        <p>Définissez:</p>
        <ul class="list-disc pl-8">
          <For each={Object.entries(props.vars)}>
            {([name, value]) => (
              <li>
                la variable <code>{name}</code> avec comme valeur <code>{value}</code>
              </li>
            )}
          </For>
        </ul>
        Ensuite, utilisez {Object.keys(props.vars).length > 1 ? 'ces variables' : 'cette variable'}{' '}
        pour calculer {props.calculate}.
      </>
    ),
    tests: (expect) => ({
      ...Object.fromEntries(
        Object.entries(props.vars).map(([name, value]) => [
          `${name} = ${value}`,
          expect.with(name).toReturn(value),
        ]),
      ),
      'La réponse finale est correcte': expect.toShow(props.answer),
    }),
  }),
)

export const LinearCombination = createDerivedStep(
  PythonCode,
  {
    c: v.tuple([v.number(), v.number()]),
    v: v.tuple([v.array(v.number()), v.array(v.number())]),
  },
  (props) => ({
    prompt: (
      <>
        <p>
          Calculez la combinaison linéaire suivante avec <code>numpy</code>:
        </p>
        {tex`
          ${props.c[0]} ${expr(props.v[0], 'vector')} ${props.c[1] > 0 ? '+' : ''} ${props.c[1]} ${expr(props.v[1], 'vector')}
        `}
      </>
    ),
    tests: (expect) => ({
      'Résultat final': expect.output().toEqualThatOf(dedent /* python */ `
        import numpy as np
        (${props.c[0]}) * np.array([${props.v[0].join(',')}]) + (${props.c[1]}) * np.array([${props.v[1].join(',')}])
      `),
      'numpy est importé': expect.code.toImport('numpy'),
      'Le code comporte une addition ou soustraction': expect.code.toMatch(/[+-]/),
      'Le code comporte au moins deux vecteurs': expect.code.toMatch(/array[\s\S]*array/),
    }),
  }),
)

export const VectorProduct = createDerivedStep(
  PythonCode,
  {
    type: v.picklist(['dot', 'cross']),
    v: v.tuple([v.array(v.number()), v.array(v.number())]),
  },
  (props) => ({
    prompt: (
      <>
        <p>
          Avec l'aide de <code>numpy</code>, calculez le produit{' '}
          {props.type === 'dot' ? 'scalaire' : 'vectoriel'}
        </p>
        {tex`
          ${expr(props.v[0], 'vector')} ${props.type === 'dot' ? `\\cdot` : `\\times`} ${expr(props.v[1], 'vector')}
        `}
      </>
    ),
    tests: (expect) => ({
      'Résultat final': expect.output().toEqualThatOf(dedent /* python */ `
        import numpy as np
        np.${props.type}([${props.v[0].join(',')}], [${props.v[1].join(',')}])
      `),
      'numpy est importé': expect.code.toImport('numpy'),
      [`${props.type} ou @ est utilisé`]: expect.code.toMatch(new RegExp(`${props.type}|@`)),
    }),
  }),
)

export const Vectorization = createDerivedStep(
  PythonCode,
  {
    x: v.array(v.string()),
    fn: v.string(),
    latex: omitFromJSON(v.custom<(x: string) => string>(() => true)),
  },
  (props) => ({
    prompt: (
      <>
        <p>
          Avec l'aide de <code>numpy</code>, calculez les coordonnées du vecteur
        </p>
        {tex`
          \begin{pmatrix}
            ${props.x.map((x) => props.latex(x)).join('\\\\')}
          \end{pmatrix}
        `}
      </>
    ),
    tests: (expect) => ({
      'Résultat final': expect.output().toEqualThatOf(dedent /* python */ `
        import numpy as np
        np.${props.fn}([${props.x.join(',')}])
      `),
      'numpy est importé': expect.code.toImport('numpy'),
      'Le calcul est vectorisé': expect.code.toSatisfy(
        (code) => code.split(props.fn).length < props.x.length,
      ),
    }),
  }),
)

const Norm = createDerivedStep(PythonCode, { x: v.array(v.number()) }, (props) => ({
  prompt: (
    <>
      <p>
        Avec l'aide de <code>numpy</code>, calculez la norme du vecteur
      </p>
      {tex`
        \begin{pmatrix}
          ${props.x.join('\\\\')}
        \end{pmatrix}
      `}
    </>
  ),
  tests: (expect) => ({
    'Résultat final': expect.output().toEqualThatOf(dedent /* python */ `
      import numpy as np
      np.linalg.norm([${props.x.join(',')}])
    `),
  }),
}))

export const NormSequence = () => (
  <Sequence id="norm">
    <Norm x={[-14, -13, 35]} />
    <Norm x={[-3, -7, 8]} />
    <Norm x={[-13, 23, 7, -15, 12]} />
    <Norm x={[-13, 3, -27, -18, 24, 0.5]} />
  </Sequence>
)

export function Review() {
  return (
    <Sequence id="final-exercises">
      <PythonCode
        prompt={
          <p>
            Avec l'aide de <code>numpy</code>, calculez le volume du parallélépipède engendré par
            les vecteurs {tex`\vec a = (1, -2, 3)`}, {tex`\vec b = (4, 5, -6)`} et{' '}
            {tex`\vec c = (7, 8, -9)`}.
          </p>
        }
        tests={(expect) => ({
          'Résultat final': expect.output().toEqualThatOf(dedent /* python */ `
            import numpy as np
            a = np.array([1, -2, 3])
            b = np.array([4, 5, -6])
            c = np.array([7, 8, -9])
            np.abs(np.dot(a, np.cross(b, c)))
          `),
          'numpy est importé': expect.code.toImport('numpy'),
          'cross est utilisé': expect.code.toCall('np.cross'),
          'dot ou @ est utilisé': expect.code.toMatch(/dot|@/),
        })}
      />
      <PythonCode
        prompt={
          <p>
            Avec l'aide de <code>numpy</code>, calculez la distance entre les points{' '}
            {tex`A(-1, 7, -8)`} et {tex`B(4, -17, -6)`}.
          </p>
        }
        tests={(expect) => ({
          'Résultat final': expect.output().toEqualThatOf(dedent /* python */ `
            import numpy as np
            A = np.array([-1, 7, -8])
            B = np.array([4, -17, -6])
            np.linalg.norm(A - B)
          `),
          'numpy est importé': expect.code.toImport('numpy'),
        })}
      />
      <PythonCode
        prompt={
          <p>
            Avec l'aide de <code>numpy</code>, calculez l'angle <strong>en degrés</strong> entre les
            vecteurs {tex`\vec a = (4, -3, 2, 9)`} et {tex`\vec b = (-6, 1, 13, -4)`}.
          </p>
        }
        tests={(expect) => ({
          'Résultat final': expect.output().toEqualThatOf(dedent /* python */ `
            import numpy as np
            a = np.array([4, -3, 2, 9])
            b = np.array([-6, 1, 13, -4])
            cos_theta = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
            theta = np.arccos(cos_theta)
            np.degrees(theta)
          `),
          'numpy est importé': expect.code.toImport('numpy'),
          'arccos est utilisé': expect.code.toCall('np.arccos'),
        })}
      />
      <PythonCode
        prompt={
          <p>
            À l'aide de <code>numpy</code>, calculez la <strong>norme</strong> du vecteur{' '}
            {tex`\vec v = (3, -2, -4, 9)`},{' '}
            <em>
              sans utiliser <code>linalg.norm</code>.
            </em>
          </p>
        }
        tests={(expect) => ({
          'Résultat final': expect.output().toEqualThatOf(dedent /* python */ `
            import numpy as np
            np.linalg.norm([3, -2, -4, 9])
          `),
          'numpy est importé': expect.code.toImport('numpy'),
          'sqrt est utilisé': expect.code.toCall('np.sqrt'),
          "linalg n'est pas utilisé": expect.code.not.toMatch(/linalg/),
        })}
      />
      <PythonCode
        prompt={
          <p>
            À l'aide de <code>numpy</code>, calculez la <strong>projection vectorielle</strong> du
            vecteur {tex`\vec a = (4, -3, 2, 9)`} sur le vecteur {tex`\vec b = (-6, 1, 13, -4)`}.
          </p>
        }
        tests={(expect) => ({
          'Résultat final': expect.output().toEqualThatOf(dedent /* python */ `
            import numpy as np
            a = np.array([4, -3, 2, 9])
            b = np.array([-6, 1, 13, -4])
            (np.dot(a, b) / np.dot(b, b)) * b
          `),
          'numpy est importé': expect.code.toImport('numpy'),
        })}
      />
    </Sequence>
  )
}

export const Representable = createDerivedStep(
  MultipleChoice,
  { x: 'expr' },
  (props) => ({
    prompt: (
      <p>Le nombre {tex`${props.x}`} est représentable en binaire avec un nombre fini de bits</p>
    ),
    choices: new Map([
      ['true', 'Vrai'],
      ['false', 'Faux'],
    ]),
    grade: (sel) => {
      const expr = props.x.simplify().evaluate().json
      if (!Array.isArray(expr) || !['Rational', 'Divide'].includes(expr[0]))
        throw new Error('Expected a rational number')
      const [, , n] = expr as [string, number, number]
      const answer = n > 0 && (n & (n - 1)) === 0
      return sel.equals([answer ? 'true' : 'false'])
    },
  }),
  {
    feedback: (ctx) => {
      const frac = () => ctx.data.x.simplify().evaluate().json as [string, number, number]
      const powerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0
      const representable = () => powerOfTwo(frac()[2])
      const binary = () => (frac()[1] / frac()[2]).toString(2)
      return (
        <>
          <Show when={ctx.correct}>
            <p>
              Correct! <CheckMark value={true} />
            </p>
          </Show>
          <p>
            Après simplification, on obtient {tex`\frac{${frac()[1]}}{${frac()[2]}}`}, et le
            dénominateur {tex`${frac()[2]}`} {representable() ? 'est' : "n'est pas"} une puissance
            de {tex`2`}. Dès lors, le nombre {tex`${ctx.data.x}`}{' '}
            {representable() ? 'est' : "n'est pas"} représentable avec un nombre fini de bits.
          </p>
          <p>En fait,</p>
          {tex`
            ${ctx.data.x} = (${binary()}${representable() ? '' : '\\dots'})_{2}
          `}
        </>
      )
    },
  },
)

export function Input(props: { number: number; onChange?: (n: number) => void }) {
  return (
    <input
      class="rounded border border-gray-500 p-2"
      value={props.number}
      onInput={(e) => {
        const newNumber = parseFloat(e.target.value)
        if (!isNaN(newNumber)) {
          props.onChange?.(newNumber)
        }
      }}
    />
  )
}

export const BinaryRepresentation = (props: { value: number }) => {
  const binary = () => props.value.toString(2)
  return (
    <code>
      {binary()}
      {(binary().split('.').at(1)?.length ?? 0) > 10 ? '...' : ''}
    </code>
  )
}
