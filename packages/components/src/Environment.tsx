import type { JSX } from '@solidjs/web'
import { Show, type ComponentProps } from 'solid-js'

const config = {
  example: { label: 'Exemple', class: 'bg-cyan-900 text-white' },
  remark: { label: 'Remarque', class: 'bg-amber-700 text-white' },
  exercise: { label: 'Exercice', class: 'bg-green-700 text-white' },
} as const satisfies Record<string, { label: string; class: string }>

/**
 * Create a generic box to display content
 * (e.g. examples, definitions, exercises, etc.)
 */
export function Environment(props: {
  children?: JSX.Element
  title?: JSX.Element
  type: keyof typeof config
}) {
  return (
    <div class="mx-8 my-4 rounded-b-xl border border-gray-200 print:break-inside-avoid">
      <h3 class={['not-prose rounded-t-sm px-4 py-1', config[props.type].class]}>
        {config[props.type].label}
        <Show when={props.title}>
          <span class="font-light"> ({props.title})</span>
        </Show>
      </h3>
      <div class="my-4 p-4">{props.children}</div>
    </div>
  )
}

function makeEnvironment(type: keyof typeof config) {
  return (props: Omit<ComponentProps<typeof Environment>, 'type'>) => (
    <Environment type={type} {...props} />
  )
}

/**
 * Component to display an example
 */
export const Example = makeEnvironment('example')
export const Exercise = makeEnvironment('exercise')
export const Remark = makeEnvironment('remark')
