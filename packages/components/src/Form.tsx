import type { JSX } from '@solidjs/web'
import { createContext, omit } from 'solid-js'
import { Boundary } from './Boundary'

export const FormState = createContext<() => { readOnly?: boolean }>(() => ({
  readOnly: false,
}))

export function Form(props: JSX.IntrinsicElements['form'] & { readOnly?: boolean }) {
  const attrs = omit(props, 'children')
  return (
    <Boundary>
      <form {...attrs}>
        <fieldset disabled={props.readOnly}>
          <FormState value={() => ({ readOnly: props.readOnly })}>{props.children}</FormState>
        </fieldset>
      </form>
    </Boundary>
  )
}
