import type { JSX } from '@solidjs/web'
import 'mathlive'
import type { MathfieldElement, MathfieldElementAttributes } from 'mathlive'
import { createEffect } from 'solid-js'

declare module '@solidjs/web' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': HTMLAttributes<MathfieldElement> &
        Properties<MathfieldElement> &
        Partial<MathfieldElementAttributes>
    }
  }
}

export function MathField(
  props: Omit<JSX.HTMLAttributes<MathfieldElement>, 'value'> &
    Partial<MathfieldElementAttributes> & { value: string },
) {
  let field!: HTMLSpanElement
  let mathfield!: MathfieldElement
  createEffect(
    () => props.value,
    (value) => {
      if (mathfield?.getValue() !== value) {
        try {
          mathfield?.setValue(value)
        } catch {}
      }
    },
  )
  return (
    <span ref={field}>
      <math-field
        ref={mathfield}
        {...props}
        value={(props.value as string) ?? ''}
        placeholder={`\\text{${props.placeholder ?? ''}}`}
        onKeyDown={(event) => {
          if (event.key.startsWith('Arrow')) {
            event.stopPropagation()
          }
          if (event.key === 'Enter') {
            field.closest('form')?.requestSubmit()
          }
        }}
      />
    </span>
  )
}

export default MathField
