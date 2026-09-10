import 'mathlive'
import type { MathfieldElement, MathfieldElementAttributes } from 'mathlive'

declare module '@solidjs/web' {
  namespace JSX {
    type ElementProps<T> = {
      [K in keyof T]: Props<T[K]> & HTMLAttributes<T[K]>
    }
    type Props<T> = {
      [K in keyof T as `prop:${string & K}`]?: T[K]
    }
    interface IntrinsicElements {
      'math-field': Partial<ElementProps<MathfieldElement>>
    }
  }
}

export function MathField(props: Partial<MathfieldElementAttributes>) {
  let field!: HTMLSpanElement
  return (
    <span ref={field}>
      <math-field
        {...props}
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
