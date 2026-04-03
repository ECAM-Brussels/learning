import { Show } from 'solid-js'

type Props = {
  value?: boolean
}
export function CheckMark(props: Props) {
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
