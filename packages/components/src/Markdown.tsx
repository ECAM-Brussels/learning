import { micromark } from 'micromark'
import { math, mathHtml } from 'micromark-extension-math'
import type { JSX } from 'solid-js/jsx-runtime'

type MarkdownProps = {
  class?: JSX.ClassList
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
