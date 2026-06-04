import 'mathlive'
import type { MathfieldElement, MathfieldElementAttributes } from 'mathlive'

declare module 'solid-js' {
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
  return <math-field {...props} placeholder={`\\text{${props.placeholder ?? ''}`} />
}
