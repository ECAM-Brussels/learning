import { Show, type ComponentProps } from 'solid-js'
import type { JSX } from 'solid-js/jsx-runtime'

const config = {
  feedback: { label: 'Feedback' },
  example: { label: 'Example' },
} as const satisfies Record<string, { label: string }>

/**
 * Create a generic box to display content
 * (e.g. examples, definitions, exercises, etc.)
 */
export default function Environment(props: {
  children: JSX.Element
  title?: JSX.Element
  type: keyof typeof config
}) {
  return (
    <div class="rounded-xl border border-gray-200 p-4">
      <h3 class="not-prose font-bold">
        {config[props.type].label}
        <Show when={props.title}>{props.title}</Show>
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
