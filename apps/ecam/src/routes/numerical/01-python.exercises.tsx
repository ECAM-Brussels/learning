import { Attempt, CheckMark, Highlight, Question } from '@learning/components'
import { Exercise, expr, tex } from '@learning/core'
import { PythonCode } from '@learning/exercises/python/Code'
import { python, type FinalOutput } from '@learning/repl'
import { type JSX } from '@solidjs/web'
import { allKeyed, dedent } from 'es-toolkit'
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

export async function getRep(number: string) {
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
            return (
              <>
                <Show when={!ctx.correct}>
                  <p>On vérifie que</p>
                  {tex`${props.prompt} = ${expr(props.prompt).simplify()}`}
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
                <p>
                  {props.inexact!.length > 0 ? 'Ces approximations' : 'Cette approximation'} se
                  propage ensuite dans les calculs.
                </p>
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
    {
      desc: `La réponse finale est correcte`,
      test: null,
      check: ({ result }: FinalOutput) => result === String(props.answer),
    },
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

export function LinearCombination(props: { c: [number, number]; v: [number[], number[]] }) {
  return (
    <PythonCode
      prompt={
        <>
          <p>
            Calculez la combinaison linéaire suivante avec <code>numpy</code>:
          </p>
          {tex`
            ${props.c[0]} ${expr(props.v[0])} + ${props.c[1]} ${expr(props.v[1])}
          `}
        </>
      }
      tests={[
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
      ]}
    />
  )
}

export function VectorProduct(props: { v: [number[], number[]]; type: 'dot' | 'cross' }) {
  return (
    <PythonCode
      prompt={
        <>
          <p>
            Avec l'aide de <code>numpy</code>, calculez le produit{' '}
            {props.type === 'dot' ? 'scalaire' : 'vectoriel'}
          </p>
          {tex`
            ${expr(props.v[0])} ${props.type === 'dot' ? `\\cdot` : `\\times`} ${expr(props.v[1])}
          `}
        </>
      }
      tests={[
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
      ]}
      check={(code) => code.includes('numpy') && code.includes(props.type)}
    />
  )
}
