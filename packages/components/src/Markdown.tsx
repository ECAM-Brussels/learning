import type { JSX } from '@solidjs/web'
import { micromark } from 'micromark'
import { math, mathHtml } from 'micromark-extension-math'

type MarkdownProps = {
  class?: JSX.ClassValue
  value?: string
}

export function Markdown(props: MarkdownProps) {
  const html = () =>
    props.value &&
    micromark(props.value, {
      extensions: [math()],
      htmlExtensions: [mathHtml()],
    })
  return <span class={props.class ?? 'prose'} innerHTML={html()} />
}
