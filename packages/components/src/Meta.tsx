import { useLocation } from '@solidjs/router'
import { type JSX } from '@solidjs/web'
import { Crumb } from './Breadcrumbs'

type Meta = {
  title: string
}

export function defineMeta(meta: Meta) {
  return (props: { children: JSX.Element }) => {
    const location = useLocation()
    return (
      <Crumb title={meta.title} href={location.pathname}>
        {props.children}
      </Crumb>
    )
  }
}
