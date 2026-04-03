import { expr, Expression } from '@learning/core'
import { Dynamic } from '@solidjs/web'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { createMemo, Loading } from 'solid-js'
import * as v from 'valibot'

export function Latex(props: { value: Expression; displayMode?: boolean }) {
  const html = createMemo(async () => {
    const latex =
      typeof props.value === 'string'
        ? props.value
        : await expr(v.parse(Expression, props.value)).latex()
    return katex.renderToString(latex, {
      displayMode: props.displayMode,
      strict: false,
      output: 'html',
      macros: {
        '\\placeholder': '',
        '\\exponentialE': 'e',
        '\\imaginaryI': 'i',
      },
    })
  })
  return (
    <Loading>
      <Dynamic component={props.displayMode ? 'div' : 'span'} innerHTML={html()} />
    </Loading>
  )
}
