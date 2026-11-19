import { Boundary, Heading } from '@learning/components'
import { hasPermissions } from '@learning/core'
import { type RouteDefinition } from '@solidjs/router'
import type { JSX } from '@solidjs/web'
import { createMemo, For, Show } from 'solid-js'
import { paths } from '../../router'
import banner from './banner.jpg'
import { isReleased, type Session, sessions } from './sessions.meta'

export const route = {
  preload() {
    hasPermissions(['draft:read'])
  },
} satisfies RouteDefinition

export default () => (
  <>
    <img src={banner} class="h-90 w-full rounded-xl object-cover opacity-90" />
    <Heading level={1}>Méthodes numériques</Heading>
    <Heading level={2}>Informations</Heading>
    <table class="rounded-xl border border-slate-200 text-base shadow-sm">
      <tbody>
        <TR>
          <TH>Activité</TH>
          <TD>Méthodes numériques</TD>
        </TR>
        <TR>
          <TH>UE associée</TH>
          <TD>Informatique, algorithmique et méthodes numériques (3 crédits)</TD>
        </TR>
        <TR>
          <TH>Enseignants</TH>
          <TD>
            <ul class="columns-2">
              <li>Nicolas Burny</li>
              <li>Ruben Hillewaere</li>
              <li>Khôi Nguyễn</li>
              <li>Jacek Jonas-Szatanski</li>
            </ul>
          </TD>
        </TR>
        <TR>
          <TH>Charge de travail</TH>
          <TD>
            <ul>
              <li>Q1: 6 séances d'exercices</li>
              <li>Q2: 6 séances d'exercices</li>
            </ul>
          </TD>
        </TR>
        <TR>
          <TH>Évaluation</TH>
          <TD>
            <ul>
              <li>Janvier: examen écrit (50%)</li>
              <li>Juin: examen écrit (50%)</li>
            </ul>
          </TD>
        </TR>
      </tbody>
    </table>
    <Heading level={2}>Séances d'exercices</Heading>
    <div class="grid gap-2 lg:grid-cols-2">
      <For each={sessions}>{(session) => <SessionCard session={session} />}</For>
    </div>
  </>
)

function TD(props: JSX.IntrinsicElements['td']) {
  return <td {...props} class="px-4" />
}

function TH(props: JSX.IntrinsicElements['th']) {
  return <th {...props} class="px-4" />
}

function TR(props: JSX.IntrinsicElements['tr']) {
  return <tr {...props} class="px-4 even:bg-gray-50" />
}

function SessionCard(props: { session: Session }) {
  const isDraft = createMemo(() => !isReleased(props.session))
  const show = createMemo(() => (isDraft() ? hasPermissions(['draft:read']) : true))
  return (
    <Boundary>
      <Show when={show()}>
        <a href={paths.MN1M[props.session.link] as string} class="not-prose no-underline">
          <div class="border border-slate-200 bg-cover bg-center shadow-xs hover:bg-blue-50">
            <Show when={props.session.img} fallback={<div class="h-48 w-full bg-slate-100" />}>
              <img
                src={props.session.img}
                class={[
                  'h-48 w-full object-cover transition ease-in-out',
                  {
                    'opacity-30 grayscale hover:opacity-100 hover:grayscale-0': isDraft(),
                    'opacity-80 hover:opacity-100': !isDraft(),
                  },
                ]}
              />
            </Show>
            <h3 class="px-2 py-4 text-lg font-bold text-stone-700">
              Session {props.session.index} - {props.session.title}{' '}
              <Show when={isDraft()}>(non publié)</Show>
            </h3>
          </div>
        </a>
      </Show>
    </Boundary>
  )
}
