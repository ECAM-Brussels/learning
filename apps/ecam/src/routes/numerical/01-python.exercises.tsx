import { Attempt, CheckMark, Highlight, Question } from '@learning/components'
import { Exercise, expr, tex } from '@learning/core'
import { PythonCode } from '@learning/exercises/python/Code'
import { python, type FinalOutput } from '@learning/repl'
import { type JSX } from '@solidjs/web'
import { allKeyed } from 'es-toolkit'
import {
  createMemo,
  createProjection,
  createSignal,
  flush,
  For,
  merge,
  Repeat,
  Show,
} from 'solid-js'

export function Integer(rawProps: {
  mode?: 'decimal' | 'base' | 'both'
  base?: 2
  value?: number
  showCalculation?: boolean
}) {
  const props = merge({ mode: 'both', base: 2, value: 0 }, rawProps)
  const [number, setNumber] = createSignal(() => props.value)

  const bits = createMemo(() => {
    const magnitude = Math.abs(number()).toString(props.base).split('').map(Number)
    const padding = Array(Math.max(0, 8 - magnitude.length)).fill(0)
    return [0, ...padding, ...magnitude]
  })

  function changeBit(index: number, value: number) {
    const newBits = bits().slice()
    newBits[index] = value
    setNumber(parseInt(newBits.join(''), props.base))
    flush()
  }

  return (
    <div class="not-prose m-4 flex gap-8 rounded-xl p-4 shadow-sm">
      <div class="text-right">
        <h4 class="font-bold">Nombre:</h4>
        <input
          class="text-right"
          type="number"
          value={number()}
          onInput={(e) => setNumber(Number(e.target.value))}
          disabled={props.mode === 'base'}
        />
      </div>
      <div>
        <h4 class="font-bold">Représentation en base {props.base}:</h4>
        <div class="grid auto-cols-fr grid-flow-col gap-2 divide-x divide-solid divide-gray-300">
          <Repeat count={bits().length}>
            {(i) => (
              <div class="border-collapse text-center">
                <div
                  class="font-xs my-0 text-center text-gray-300"
                  title={String(props.base ** (bits().length - i - 1))}
                >{tex`\small ${props.base}^{${String(bits().length - i - 1)}}`}</div>
                <input
                  class={['font-mono']}
                  type="number"
                  onInput={(e) => changeBit(i, Number(e.target.value))}
                  value={bits()[i] ?? 0}
                  max={props.base - 1}
                  min={0}
                  disabled={props.mode === 'decimal'}
                />
              </div>
            )}
          </Repeat>
        </div>
      </div>
      <Show when={props.showCalculation}>
        <div>
          <h4 class="font-bold">Calcul:</h4>
          {tex`${bits()
            .map((b, i) => [b, i])
            .filter(([b]) => b !== 0)
            .map(
              ([b, i]) =>
                `
                  ${b}
                  \\cdot
                  \\underbrace{${props.base ** (bits().length - i - 1)}}_{${props.base}^{${String(bits().length - i - 1)}}}
                `,
            )
            .join(' + ')}
            = ${number() ?? '0'}
          `}
        </div>
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
