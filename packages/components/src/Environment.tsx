import type { JSX } from '@solidjs/web'
import { Show, type ComponentProps } from 'solid-js'

const config = {
  feedback: { label: 'Feedback' },
  example: { label: 'Example' },
  remark: { label: 'Remark' },
} as const satisfies Record<string, { label: string }>

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
    <div class="my-4 rounded-xl border border-gray-200 p-4 print:break-inside-avoid">
      <h3 class="not-prose font-bold">
        {config[props.type].label}
        <Show when={props.title}>
          <span class="font-light"> ({props.title})</span>
        </Show>
      </h3>
      {props.children}
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
export const Remark = makeEnvironment('remark')
