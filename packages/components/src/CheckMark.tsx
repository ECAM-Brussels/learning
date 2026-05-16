import { Show, type JSX } from 'solid-js'

/**
 * Display a check mark or a cross depending on `value`
 *
 * If the value is undefined, nothing is displayed.
 *
 * @example
 * <CheckMark value={true} /> // ✓
 * <CheckMark value={false} /> // ❌
 * <CheckMark /> // (nothing)
 */
export default function CheckMark(props: {
  /**
   * Specify whether to display a check mark (true), a cross (false), or nothing (undefined).
   */
  value?: boolean
}): JSX.Element {
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
