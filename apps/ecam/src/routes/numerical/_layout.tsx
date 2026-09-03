import { BreadCrumbs, Crumb, Page } from '@learning/components'
import { getUser } from '@learning/core'
import type { JSX } from '@solidjs/web/jsx-runtime'
import { createMemo, Show } from 'solid-js'

export default function Layout(props: { children: JSX.Element }) {
  const user = createMemo(() => getUser())
  return (
    <Page>
      <BreadCrumbs />
      <Show when={user() === null}>
        <p class="mb-4 rounded-lg border border-red-100 bg-red-50 p-4">
          Si vous êtes étudiant·e à l'ECAM, nous vous invitons à vous connecter pour pouvoir
          sauvegarder votre progression. En tant qu'invité·e, vous ne sauvegarderez vos réponses que
          sur cet appareil.
        </p>
      </Show>
      <Crumb href="/numerical" title="Analyse numérique">
        {props.children}
      </Crumb>
    </Page>
  )
}
