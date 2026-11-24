import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { For, Show } from 'solid-js'
import { Fa } from './Fa'
import { useCrumbs } from './Meta'

export function BreadCrumbs() {
  const crumbs = useCrumbs()
  return (
    <ul class="not-prose mb-4 flex list-none gap-2 p-0 text-sm text-gray-400">
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
