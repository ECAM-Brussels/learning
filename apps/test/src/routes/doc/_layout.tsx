import { BreadCrumbs, Crumb, Page } from '@learning/components'
import type { JSX } from '@solidjs/web/jsx-runtime'

export default function Layout(props: { children: JSX.Element }) {
  return (
    <Page>
      <BreadCrumbs />
      <Crumb href="/numerical" title="Analyse numérique">
        {props.children}
      </Crumb>
    </Page>
  )
}
