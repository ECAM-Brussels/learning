import { codeToHtml } from 'shiki'
import { createMemo, isPending, merge, omit } from 'solid-js'

type Options = Parameters<typeof codeToHtml>[1]

export default function Highlight(props: { code: string; class?: string } & Partial<Options>) {
  const options = merge({ lang: 'js', theme: 'github-light' }, omit(props, 'code', 'class'))
  const html = createMemo(() => codeToHtml(props.code, options), { name: 'html' })
  const pending = () => isPending(() => html())
  return (
    <pre
      class={[
        'not-prose m-4 rounded-md border border-gray-100 p-4 shadow-sm transition-opacity print:break-inside-avoid',
        { 'opacity-50': pending() },
        props.class,
      ]}
      aria-busy={pending() ? 'true' : 'false'}
      innerHTML={html()}
    />
  )
}
