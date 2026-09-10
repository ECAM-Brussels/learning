import { BreadCrumbs, Crumb, Page } from '@learning/components'
import type { JSX } from '@solidjs/web/jsx-runtime'
import { paths } from '../../router'

export default function Layout(props: { children: JSX.Element }) {
  return (
    <Page>
      <BreadCrumbs />
      <Crumb href={paths.doc} title="Documentation">
        {props.children}
      </Crumb>
    </Page>
  )
}
