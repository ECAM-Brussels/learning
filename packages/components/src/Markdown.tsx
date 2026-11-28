import type { JSX } from '@solidjs/web'
import { micromark } from 'micromark'
import { math, mathHtml } from 'micromark-extension-math'

type MarkdownProps = {
  class?: JSX.ClassValue
  value?: string
}

/**
 * Markdown given as text, with maths between `$`, such as text built in code.
 *
 * @example
 * <Markdown value={`La dérivée de $x^${n}$ est $${n}x^${n - 1}$.`} />
 */
export function Markdown(props: MarkdownProps) {
  const html = () =>
    props.value &&
    micromark(props.value, {
      extensions: [math()],
      htmlExtensions: [mathHtml()],
    })
  return <span class={props.class ?? 'prose'} innerHTML={html()} />
}
