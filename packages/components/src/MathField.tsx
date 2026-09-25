import 'mathlive'
import type { MathfieldElement, MathfieldElementAttributes } from 'mathlive'
import { createEffect } from 'solid-js'

declare module '@solidjs/web' {
  namespace JSX {
    type ElementProps<T> = {
      [K in keyof T]: Props<T[K]> & HTMLAttributes<T[K]>
    }
    type Props<T> = {
      [K in keyof T as `prop:${string & K}`]?: T[K]
    }
    interface IntrinsicElements {
      'math-field': Partial<ElementProps<MathfieldElement>> & { ref?: MathfieldElement }
    }
  }
}

export function MathField(props: Partial<MathfieldElementAttributes> & { value: string }) {
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
        placeholder={`\\text{${props.placeholder ?? ''}`}
        onkeydown={(event: KeyboardEvent) => {
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
