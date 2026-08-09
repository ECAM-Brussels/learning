import { codeToHtml } from 'shiki'
import { createMemo, merge, omit } from 'solid-js'

type Options = Parameters<typeof codeToHtml>[1]

export default function Highlight(props: { code: string; class?: string } & Partial<Options>) {
  const options = merge({ lang: 'js', theme: 'github-light' }, omit(props, 'code', 'class'))
  const html = createMemo(() => codeToHtml(props.code, options), { ssrSource: 'client' })
  return (
    <pre
      class={[
        'not-prose m-4 rounded-md border border-gray-100 p-4 shadow-sm print:break-inside-avoid',
        props.class,
      ]}
      innerHTML={html()}
    />
  )
}
