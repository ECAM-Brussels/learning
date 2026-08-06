import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { type JSX } from '@solidjs/web'
import {
  createContext,
  createSignal,
  createStore,
  For,
  omit,
  onSettled,
  runWithOwner,
  Show,
} from 'solid-js'
import { Fa } from './Fa'

type Crumb = { href: string; title: string }

const [crumbs, setCrumbs] = runWithOwner(null, () => createStore<Crumb[]>([]))
export const BreadCrumbsContext = createContext(setCrumbs)

export function BreadCrumbs() {
  return (
    <ul class="not-prose my-4 flex list-none gap-2 p-0 text-sm text-gray-600">
      <For each={crumbs}>
        {(crumb, i) => (
          <>
            <li>
              <a href={crumb.href}>{crumb.title}</a>
            </li>
            <Show when={i() < crumbs.length - 1}>
              <li>
                <Fa icon={faChevronRight} />
              </li>
            </Show>
          </>
        )}
      </For>
    </ul>
  )
}

export function Crumb(props: Crumb & { children: JSX.Element }) {
  const [position, setPosition] = createSignal<number | null>(null)
  const crumb = omit(props, 'children')

  onSettled(() => {
    setPosition(crumbs.length)
    setCrumbs((s) => {
      s.push(crumb)
    })

    return () => {
      setCrumbs((s) => {
        s.splice(position()!, 1)
      })
    }
  })

  return props.children
}
