import { Code } from '@learning/components/Code'
import Latex from '@learning/components/Latex'
import Markdown from '@learning/components/Markdown'
import MathField from '@learning/components/MathField'
import { createMemo, Show } from 'solid-js'
import * as v from 'valibot'
import { Encrypted as EncryptedSchema } from './crypto'
import { defineField } from './exercise/base'
import { expr, Expression } from './expr'

export function Encrypted(label: string) {
  return defineField({
    ...v.custom<EncryptedSchema>((v) => typeof v === 'string'),
    label,
  })
}

export function Python(label: string) {
  return defineField({
    ...v.string(),
    label,
    Component: (props) => (
      <Code lang="python" onChange={props.onChange} run>
        {props.value ?? ''}
      </Code>
    ),
  })
}

export function Text(label: string) {
  return defineField({
    ...v.string(),
    label,
    Component: (props) => {
      return <Markdown value={props.value} />
    },
  })
}

const TestBase = v.array(
  v.object({
    test: v.string(),
    result: v.string(),
  }),
)

export function Tests(label: string) {
  return defineField({
    ...TestBase,
    label,
    Component: (props) => <>{props.value}</>,
  })
}

export function Math(label: string) {
  const base = v.pipe(
    v.string(),
    v.nonEmpty(),
    v.check((v) => {
      try {
        expr(v)
        return true
      } catch (error) {
        return false
      }
    }, 'Expression mathématique invalide'),
  )
  return defineField({
    ...v.union([
      v.pipe(
        v.string(),
        v.transform((s) => expr(s)),
      ),
      Expression,
    ]),
    label,
    Component: (props) => {
      const valid = createMemo(() => v.safeParse(base, props.currentValue).success)
      return (
        <Show
          when={!props.question}
          fallback={
            <span title={props.label}>
              <Show when={props.value}>
                <Latex value={props.value!} />
              </Show>
            </span>
          }
        >
          <MathField
            class={[
              'rounded border p-2 outline-none',
              {
                'border-slate-200 bg-slate-50': props.readOnly === true,
                'border-red-200': !props.readOnly && !valid(),
                'border-green-500': !props.readOnly && valid(),
              },
            ]}
            placeholder={props.label}
            title={props.label}
            value={props.value?.rawInput ?? props.value?.rawInput ?? ''}
            readonly={props.question || props.readOnly}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                props.requestSubmit()
              }
            }}
            onInput={(event: InputEvent & { target: HTMLInputElement }) => {
              if (!props.question) {
                props.onChange(event.target.value)
              }
            }}
          />
        </Show>
      )
    },
  })
}
