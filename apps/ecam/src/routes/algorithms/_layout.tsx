import { BreadCrumbs, Meta, Page } from '@learning/components'
import { getUser } from '@learning/core'
import { type RouteDefinition } from '@solidjs/router'
import type { JSX } from '@solidjs/web/jsx-runtime'
import { createMemo, Show } from 'solid-js'
import { paths } from '../../router'

export const route = {
  preload() {
    getUser()
  },
} satisfies RouteDefinition

export default function Layout(props: { children: JSX.Element }) {
  const user = createMemo(() => getUser())
  return (
    <Page lang="en">
      <BreadCrumbs />
      <Show when={user() === null}>
        <p class="mb-4 rounded-lg border border-red-100 bg-red-50 p-4">
          If you are an ECAM student, please log in to save your progress. As a guest, your answers
          are only saved on this device.
        </p>
      </Show>
      <Meta href={paths.algorithms} title="Algorithms" lang="en">
        {props.children}
      </Meta>
    </Page>
  )
}
