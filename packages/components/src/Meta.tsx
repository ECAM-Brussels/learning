import { useLocation } from '@solidjs/router'
import { type JSX } from '@solidjs/web'
import { createMemo, Show } from 'solid-js'
import { Crumb } from './Breadcrumbs'

type Meta = {
  title: string
  authorized?: () => boolean | Promise<boolean>
}

export function Meta(props: Meta & { children: JSX.Element }) {
  const location = useLocation()
  const authorized = createMemo(() => props.authorized?.() ?? true)
  return (
    <Crumb title={props.title} href={location.pathname}>
      <Show when={authorized()} fallback={<p>Vous n'avez pas l'autorisation de voir cette page</p>}>
        {props.children}
      </Show>
    </Crumb>
  )
}

export function defineMeta(meta: Meta) {
  return (props: { children: JSX.Element }) => {
    return <Meta {...meta} {...props} />
  }
}
