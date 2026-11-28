import type { JSX } from '@solidjs/web'
import { clientOnly, dynamic } from '@solidjs/web'
import dedent from 'dedent'
import {
  createEffect,
  createMemo,
  createSignal,
  Loading,
  merge,
  Show,
  useContext,
  type Component,
  type ComponentProps,
} from 'solid-js'
import { FormState } from '../Form'

const Monaco = clientOnly(() => import('./Monaco'), { lazy: true })
const CodeMirror = clientOnly(() => import('./CodeMirror'), { lazy: true })
const Python = clientOnly(() => import('../Python'), { lazy: true })

export type EditorProps = {
  class?: JSX.ClassValue | string
  lang: 'python'
  children: string
  highlight?: number[]
  onChange?: (value: string) => void
  readOnly?: boolean
}

type Props = Omit<EditorProps, 'lang'> & {
  backend?: 'monaco' | 'codemirror'
} & {
  lang: 'python'
  run?: string | boolean
  math?: boolean
  mode?: 'automatic' | 'manual'
}

export const Code: Component<Props> = (rawProps) => {
  const props = merge({ backend: 'monaco', mode: 'automatic' }, rawProps)
  const [value, setValue] = createSignal(() => props.children)
  const editor = createMemo(() => {
    if (isMobile()) return 'codemirror'
    return props.backend
  })
  const Editor = dynamic(() => (editor() === 'monaco' ? Monaco : CodeMirror))
  const formState = useContext(FormState)

  const [code, setCode] = createSignal(() => (typeof props.run === 'string' ? props.run : ''))
  // The lines the code's `input()` reads, typed by the student: applied with the code, on ▶ in manual mode.
  const [lines, setLines] = createSignal('', { name: 'stdin-draft' })
  const [stdin, setStdin] = createSignal<string[]>([], { name: 'stdin' })
  const toLines = (text: string) => (text === '' ? [] : text.replace(/\n$/, '').split('\n'))
  const asksInput = createMemo(() => /\binput\s*\(/.test(value()), { name: 'asks-input' })
  createEffect(
    () => [value(), lines(), props.mode] as const,
    ([value, lines, mode]) => {
      if (mode === 'automatic') {
        setCode(value)
        setStdin(toLines(lines))
      }
    },
  )

  const [status, setStatus] = createSignal<'running' | 'done'>('done')

  return (
    <Loading fallback={<p>Chargement de l'éditeur...</p>}>
      <div class="my-4 flex flex-col gap-0">
        <div class="flex items-end gap-4">
          <Show when={props.mode === 'manual'}>
            <button
              class="rounded-full border border-cyan-700 px-2 text-cyan-700 disabled:border-gray-200 disabled:text-gray-200"
              type="button"
              disabled={status() === 'running'}
              onClick={() => {
                setCode(value())
                setStdin(toLines(lines()))
              }}
            >
              ▶
            </button>
          </Show>
          <Editor
            class="grow"
            children={value()}
            lang={props.lang}
            highlight={props.highlight}
            onChange={(newValue) => {
              setValue(newValue)
              props.onChange?.(newValue)
            }}
            readOnly={props.readOnly ?? formState().readOnly}
          />
        </div>
        <Show when={props.lang === 'python' && props.run && asksInput()}>
          <label class="not-prose mt-2 block text-xs text-slate-700">
            Entrées du programme, une par ligne
            <textarea
              class="mt-1 block w-full rounded-xs border border-gray-200 p-2 font-mono"
              rows={2}
              value={lines()}
              onInput={(event) => setLines(event.currentTarget.value)}
            />
          </label>
        </Show>
        <Show when={props.lang === 'python' && props.run}>
          <Loading on={code()}>
            <Python
              class="my-0 py-0"
              value={code()}
              math={props.math}
              stdin={asksInput() ? stdin() : undefined}
              onChange={(output) => {
                if (output.status === 'done') {
                  setStatus('done')
                } else {
                  setStatus('running')
                }
              }}
            />
          </Loading>
        </Show>
      </div>
    </Loading>
  )
}

export function code(props: Omit<ComponentProps<typeof Code>, 'children'>) {
  return (strings: TemplateStringsArray, ...values: unknown[]) => {
    const code = createMemo(() =>
      dedent(strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')),
    )
    return <Code {...props} children={code()} />
  }
}

function isMobile() {
  return (
    /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches)
  )
}
