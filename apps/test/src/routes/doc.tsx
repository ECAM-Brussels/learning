import { Crumb } from '@learning/components'
import type { JSX } from '@solidjs/web/jsx-runtime'

export default function Layout(props: { children: JSX.Element }) {
  return (
    <Crumb href="/doc" title="Documentation">
      {props.children}
    </Crumb>
  )
}
