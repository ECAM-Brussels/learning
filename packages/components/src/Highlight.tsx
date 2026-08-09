import { clientOnly } from '@solidjs/web'
import dedent from 'dedent'
import { type BundledLanguage } from 'shiki'
import { createMemo } from 'solid-js'

export const Highlight = clientOnly(() => import('./HighlightImplementation'))

export function hl(lang: BundledLanguage) {
  return (strings: TemplateStringsArray, ...values: unknown[]) => {
    const code = createMemo(() =>
      dedent(strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')),
    )
    return <Highlight code={code()} lang={lang} theme="github-light" />
  }
}
