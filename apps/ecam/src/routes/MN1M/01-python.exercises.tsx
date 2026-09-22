import { Attempt, CheckMark, Highlight, Question } from '@learning/components'
import { createDerivedStep, Exercise, expr, omitFromJSON, Sequence, tex } from '@learning/core'
import { MultipleChoice } from '@learning/exercises/MultipleChoice'
import { PythonCode } from '@learning/exercises/python/Code'
import { python, type FinalOutput } from '@learning/repl'
import { type JSX } from '@solidjs/web'
import { allKeyed, dedent, randomInt } from 'es-toolkit'
import { createMemo, createProjection, createSignal, For, merge, Show } from 'solid-js'
import * as v from 'valibot'

export function Integer(rawProps: {
  mode?: 'decimal' | 'base' | 'both'
  base?: 2
  value?: number
  showCalculation?: boolean
  precision?: number
}) {
  const props = merge({ mode: 'both', base: 2, value: 0, precision: 5 }, rawProps)
  const [number, setNumber] = createSignal(() => props.value)
  const [precision, setPrecision] = createSignal(() => props.precision)

  const bits = createMemo(() => {
    let bits: Record<number, number> = {}
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
      .filter(([power, bit]) => Number(power) >= -precision()),
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
          .filter(([i, b]) => b !== 0)
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
      tests={[
        {
          test: null,
          check: ({ stdout }) =>
            stdout?.toLowerCase().includes(props.message.toLowerCase()) === true,
        },
      ]}
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
              Pour afficher le message{' '}
              <input
                class="border font-mono"
                value={message()}
                onInput={(e) => setMessage(e.target.value)}
              />{' '}
              en Python, tapez:
            </p>
            <Highlight lang="python" code={`print('${message().replace("'", "\\'")}')`} />
            <details class="text-sm">
              <summary>Prêt.e à réessayer l'exercice?</summary>
              <ctx.Self />
            </details>
          </Show>
        )
      }}
    />
  )
}

export async function getRep(number: string) {
  const code = `from decimal import Decimal\nDecimal(${number})`
  return python.output(code).then((r) => r.result as string)
}

export const Calculator = createDerivedStep(
  PythonCode,
  {
    children: omitFromJSON(v.optional(v.custom<JSX.Element>(() => true))),
    prompt: v.string(),
    answer: v.union([v.number(), v.string()]),
    inexact: v.optional(v.array(v.string())),
  },
  (props) => ({
    prompt: props.children ?? <p>Utilisez Python pour calculer {tex`${props.prompt}`}</p>,
    tests: [
      {
        test: null,
        check: ({ result }) => result === String(props.answer),
      },
    ],
  }),
  {
    children: (props) => (
      <Show when={props.data.inexact !== undefined}>
        <Exercise
          schema={{ data: {}, inputs: { attempt: 'expr' } }}
          data={{}}
          prompt={(ctx) => (
            <>
              <p>Quel aurait été le résultat théorique?</p>
              <Attempt>
                {tex`${props.data.prompt} =`} {ctx.inputs.attempt}
              </Attempt>
            </>
          )}
          grade={(ctx) => ctx.inputs.attempt.isEqual(props.data.prompt)}
          feedback={(ctx) => {
            const reps = createProjection(
              () => allKeyed(Object.fromEntries(props.data.inexact!.map((n) => [n, getRep(n)]))),
              {},
            )
            return (
              <>
                <Show when={!ctx.correct}>
                  <p>On vérifie que</p>
                  {tex`${props.data.prompt} = ${expr(props.data.prompt).simplify()}`}
                </Show>
                <Question>Pourquoi la réponse de Python est-elle incorrecte?</Question>
                <p>
                  Puisque l'ordinateur utilise le <strong>binaire</strong>, certains des nombres du
                  code ont été remplacés par des <strong>approximations</strong>. Dans ce cas-ci:
                </p>
                <table>
                  <thead>
                    <tr>
                      <th class="text-right">Nombre entré</th>
                      <th>
                        Nombre réellement utilisé par <code>Python</code>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={props.data.inexact}>
                      {(n) => (
                        <tr>
                          <td class="text-right">{tex`${n}`}</td>
                          <td>
                            <code>{reps[n]}</code>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
                <p>
                  {props.data.inexact!.length > 0
                    ? 'Ces approximations se propagent'
                    : 'Cette approximation se propage'}{' '}
                  ensuite dans les calculs.
                </p>
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
        <ctx.Self />
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
        <ul>
          <For each={Object.entries(props.vars)}>
            {([name, value]) => (
              <li>
                la variable <code>{name}</code> avec comme valeur <code>{value}</code>
              </li>
            )}
          </For>
        </ul>
        Ensuite, utilisez ces variables pour calculer {props.calculate}.
      </>
    ),
    tests: [
      ...Object.entries(props.vars).map(([name, value]) => ({
        test: name,
        check: ({ result }: FinalOutput) => result === String(value),
      })),
      {
        desc: `La réponse finale est correcte`,
        test: null,
        check: ({ result }: FinalOutput) => result === String(props.answer),
      },
    ],
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
          ${props.c[0]} ${expr(props.v[0])} ${props.c[1] > 0 ? '+' : ''} ${props.c[1]} ${expr(props.v[1])}
        `}
      </>
    ),
    tests: [
      {
        test: null,
        check: async ({ result }) => {
          const { result: answer } = await python.output(dedent /* python */ `
            import numpy as np
            (${props.c[0]}) * np.array([${props.v[0].join(',')}]) + (${props.c[1]}) * np.array([${props.v[1].join(',')}])
          `)
          return result === answer
        },
      },
    ],
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
          ${expr(props.v[0])} ${props.type === 'dot' ? `\\cdot` : `\\times`} ${expr(props.v[1])}
        `}
      </>
    ),
    tests: [
      {
        test: null,
        check: async ({ result }) => {
          const { result: answer } = await python.output(dedent /* python */ `
            import numpy as np
            np.${props.type}([${props.v[0].join(',')}], [${props.v[1].join(',')}])
          `)
          return result === answer
        },
      },
    ],
    check: (code) => code.includes('numpy') && (code.includes(props.type) || code.includes('@')),
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
    tests: [
      {
        test: null,
        check: async ({ result }) => {
          const { result: answer } = await python.output(dedent /* python */ `
            import numpy as np
            np.${props.fn}([${props.x.join(',')}])
          `)
          return result === answer
        },
      },
    ],
    check: (code) => code.includes('numpy') && code.split(props.fn).length < props.x.length,
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
  tests: [
    {
      test: null,
      check: async ({ result }) => {
        const { result: answer } = await python.output(dedent /* python */ `
          import numpy as np
          np.linalg.norm([${props.x.join(',')}])
        `)
        return result === answer
      },
    },
  ],
}))

export const NormSequence = () => (
  <Sequence
    id="norm"
    next={() => (
      <Norm data={() => ({ x: [randomInt(-20, 21), randomInt(-20, 21), randomInt(-20, 21)] })} />
    )}
  />
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
        tests={[
          {
            test: null,
            check: async ({ result }) => {
              const { result: answer } = await python.output(dedent /* python */ `
                import numpy as np
                a = np.array([1, -2, 3])
                b = np.array([4, 5, -6])
                c = np.array([7, 8, -9])
                np.abs(np.dot(a, np.cross(b, c)))
              `)
              return result === answer
            },
          },
        ]}
        check={(code) =>
          code.includes('numpy') &&
          code.includes('cross') &&
          (code.includes('dot') || code.includes('@'))
        }
      />
      <PythonCode
        prompt={
          <p>
            Avec l'aide de <code>numpy</code>, calculez la distance entre les points{' '}
            {tex`A(-1, 7, -8)`} et {tex`B(4, -17, -6)`}.
          </p>
        }
        tests={[
          {
            test: null,
            check: async ({ result }) => {
              const { result: answer } = await python.output(dedent /* python */ `
                import numpy as np
                A = np.array([-1, 7, -8])
                B = np.array([4, -17, -6])
                np.linalg.norm(A - B)
              `)
              return result === answer
            },
          },
        ]}
        check={(code) => code.includes('numpy')}
      />
      <PythonCode
        prompt={
          <p>
            Avec l'aide de <code>numpy</code>, calculez l'angle <strong>en degrés</strong> entre les
            vecteurs {tex`\vec a = (4, -3, 2, 9)`} et {tex`\vec b = (-6, 1, 13, -4)`}.
          </p>
        }
        tests={[
          {
            test: null,
            check: async ({ result }) => {
              const { result: answer } = await python.output(dedent /* python */ `
                import numpy as np
                a = np.array([4, -3, 2, 9])
                b = np.array([-6, 1, 13, -4])
                cos_theta = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
                theta = np.arccos(cos_theta)
                np.degrees(theta)
              `)
              return result === answer
            },
          },
        ]}
        check={(code) => code.includes('numpy') && code.includes('arccos')}
      />
      <PythonCode
        prompt={
          <p>
            À l'aide de <code>numpy</code>, calculez la <strong>norme</strong> du vecteur{' '}
            {tex`\vec v = (3, -2, -4, 9)`},
            <em>
              sans utiliser <code>linalg.norm</code>.
            </em>
          </p>
        }
        tests={[
          {
            test: null,
            check: async ({ result }) => {
              const { result: answer } = await python.output(dedent /* python */ `
                import numpy as np
                np.linalg.norm([3, -2, -4, 9])
              `)
              return result === answer
            },
          },
        ]}
        check={(code) =>
          code.includes('numpy') && code.includes('sqrt') && !code.includes('linalg')
        }
      />
      <PythonCode
        prompt={
          <p>
            À l'aide de <code>numpy</code>, calculez la projection du vecteur{' '}
            {tex`\vec a = (4, -3, 2, 9)`} sur le vecteur {tex`\vec b = (-6, 1, 13, -4)`}.
          </p>
        }
        tests={[
          {
            test: null,
            check: async ({ result }) => {
              const { result: answer } = await python.output(dedent /* python */ `
                import numpy as np
                a = np.array([4, -3, 2, 9])
                b = np.array([-6, 1, 13, -4])
                (np.dot(a, b) / np.dot(b, b)) * b
              `)
              return result === answer
            },
          },
        ]}
        check={(code) => code.includes('numpy')}
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
    options: new Map([
      ['true', 'Vrai'],
      ['false', 'Faux'],
    ]),
    grade: (sel) => {
      const expr = props.x.simplify().evaluate().json
      if (!Array.isArray(expr) || !['Rational', 'Divide'].includes(expr[0]))
        throw new Error('Expected a rational number')
      const [_, m, n] = expr as [string, number, number]
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
