import { clientOnly } from '@solidjs/web'
import dedent from 'dedent'
import { type BundledLanguage } from 'shiki'
import { createMemo, Loading } from 'solid-js'

export const Highlight = clientOnly(() => import('./HighlightImplementation'), { lazy: true })

export function hl(lang: BundledLanguage) {
  return (strings: TemplateStringsArray, ...values: unknown[]) => {
    const code = createMemo(() =>
      dedent(strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')),
    )
    return (
      <Loading on={code()}>
        <Highlight code={code()} lang={lang} theme="github-light" />
      </Loading>
    )
  }
}
