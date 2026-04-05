import { Show, type JSX } from 'solid-js'

type Props = {
  value?: boolean
}
export default function CheckMark(props: Props): JSX.Element {
  return (
    <span>
      <Show when={props.value === true}>
        <span class="text-green-700">✓</span>
      </Show>
      <Show when={props.value === false}>
        <span class="text-red-900">❌</span>
      </Show>
    </span>
  )
}
