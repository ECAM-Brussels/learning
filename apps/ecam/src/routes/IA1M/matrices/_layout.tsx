import { Crumb } from '@learning/components'
import type { JSX } from '@solidjs/web/jsx-runtime'
import { paths } from '../../../router'

export default function Layout(props: { children: JSX.Element }) {
  return (
    <Crumb href={paths.IA1M.matrices} title="Matrices">
      {props.children}
    </Crumb>
  )
}
