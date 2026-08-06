import { Page } from '@learning/components'
import type { JSX } from '@solidjs/web'

export default function Layout(props: { children: JSX.Element }) {
  return <Page>{props.children}</Page>
}
