import { Attempt, CheckMark, Highlight, Question } from '@learning/components'
import { Exercise, expr, tex } from '@learning/core'
import { PythonCode } from '@learning/exercises/python/Code'
import { python, type FinalOutput } from '@learning/repl'
import { type JSX } from '@solidjs/web'
import { allKeyed } from 'es-toolkit'
import { createMemo, createProjection, createSignal, For, merge, Show } from 'solid-js'

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
        <div class="flex justify-center gap-2 divide-x divide-solid divide-gray-300">
          <For each={entries()}>
            {([i, b], index) => (
              <div class="text-center">
                <div
                  class="font-xs my-0 text-center text-gray-300"
                  title={String(props.base ** Number(i))}
                >{tex`\small ${props.base}^{${i}}`}</div>
                <div class="flex justify-center">
                  <input
                    class="font-mono"
                    type="number"
                    onInput={(e) => changeBit(Number(i), Number(e.target.value))}
                    value={bits()[Number(i)] ?? 0}
                    max={props.base - 1}
                    min={0}
                    disabled={props.mode === 'decimal'}
                  />
                  <Show when={Number(i) === 0 && index() !== entries().length - 1}>
                    <span class="font-bold">.</span>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
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

async function getRep(number: string) {
  const code = `from decimal import Decimal\nDecimal(${number})`
  return python.output(code).then((r) => r.result as string)
}

export function Calculator(props: {
  children?: JSX.Element
  prompt: string
  answer: number | string
  inexact?: string[]
}) {
  return (
    <PythonCode
      prompt={props.children ?? <p>Utilisez Python pour calculer {tex`${props.prompt}`}</p>}
      tests={[
        {
          test: null,
          check: ({ result }) => result === String(props.answer),
        },
      ]}
      feedback={(ctx) => (
        <Show when={!ctx.correct}>
          <ctx.Self />
        </Show>
      )}
    >
      <Show when={props.inexact !== undefined}>
        <Exercise
          schema={{ data: {}, inputs: { attempt: 'expr' } }}
          data={{}}
          prompt={(ctx) => (
            <>
              <p>Quel aurait été le résultat théorique?</p>
              <Attempt>
                {tex`${props.prompt} =`} {ctx.inputs.attempt}
              </Attempt>
            </>
          )}
          grade={(ctx) => ctx.inputs.attempt.isEqual(props.prompt)}
          feedback={(ctx) => {
            const reps = createProjection(
              () => allKeyed(Object.fromEntries(props.inexact!.map((n) => [n, getRep(n)]))),
              {},
            )
            const realCalc = createMemo(() => {
              let str = props.prompt
              for (const n of props.inexact!) {
                str = str.replaceAll(n, reps[n]!)
              }
              return str
            })
            return (
              <>
                <Show when={!ctx.correct}>
                  <p>On vérifie que</p>
                  {tex`${props.prompt} = ${expr(props.prompt).simplify()}`}
                </Show>
                <Question>Pourquoi la réponse de Python est-elle incorrecte?</Question>
                <p>
                  Puisque l'ordinateur utilise le <strong>binaire</strong>, les nombres suivants ne
                  sont pas représentables exactement en Python:
                </p>
                <table>
                  <thead>
                    <tr>
                      <th class="text-right">Nombre exact</th>
                      <th>Représentation Python</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={props.inexact}>
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
                <p>Ce qui fait que pour Python, le calcul devient en fait</p>
                {tex`
                  ${props.prompt} \approx ${realCalc()}
                `}
              </>
            )
          }}
        />
      </Show>
    </PythonCode>
  )
}

export function Variables(props: {
  answer: string | number
  calculate: JSX.Element
  vars: Record<string, number>
}) {
  const tests = createMemo(() => [
    ...Object.entries(props.vars).map(([name, value]) => ({
      test: name,
      check: ({ result }: FinalOutput) => result === String(value),
    })),
    { test: null, check: ({ result }: FinalOutput) => result === String(props.answer) },
  ])
  return (
    <PythonCode
      prompt={
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
      }
      tests={tests()}
    />
  )
}
