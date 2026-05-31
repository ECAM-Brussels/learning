import dedent from 'dedent'
import { codeToHtml } from 'shiki'
import { createMemo, merge, omit } from 'solid-js'

type Options = Parameters<typeof codeToHtml>[1]

export function Highlight(props: { code: string; class?: string } & Partial<Options>) {
  const options = merge({ lang: 'js', theme: 'github-light' }, omit(props, 'code', 'class'))
  const html = createMemo(() => codeToHtml(props.code, options))
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

export function hl(lang: string) {
  return (strings: TemplateStringsArray, ...values: unknown[]) => {
    const code = createMemo(() =>
      dedent(strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')),
    )
    return <Highlight code={code()} lang={lang} theme="github-light" />
  }
}
