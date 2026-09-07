import type { JSX } from '@solidjs/web'
import { clientOnly, Dynamic } from '@solidjs/web'
import dedent from 'dedent'
import {
  createMemo,
  createSignal,
  Loading,
  Show,
  type Component,
  type ComponentProps,
} from 'solid-js'
import Python from '../Python'

const Monaco = clientOnly(() => import('./Monaco'))
const CodeMirror = clientOnly(() => import('./CodeMirror'))

export type EditorProps = {
  class?: JSX.ClassValue | string
  lang: 'python'
  children: string
  onChange?: (value: string) => void
}

type Props = Omit<EditorProps, 'lang'> & {
  backend?: 'monaco' | 'codemirror'
} & {
  lang: 'python'
  run?: boolean
  math?: boolean
}

export const Code: Component<Props> = (props) => {
  const [value, setValue] = createSignal(() => props.children)
  return (
    <Loading fallback={<p>Chargement de l'éditeur...</p>}>
      <div class="flex flex-col gap-0">
        <Dynamic
          component={props.backend === 'monaco' ? Monaco : CodeMirror}
          children={value()}
          lang={props.lang}
          onChange={(newValue) => {
            setValue(newValue)
            props.onChange?.(newValue)
          }}
        />
        <Show when={props.lang === 'python' && props.run}>
          <Python class="my-0 py-0" value={value()} math={props.math} />
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
