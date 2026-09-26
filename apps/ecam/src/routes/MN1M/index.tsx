import { Heading } from '@learning/components'
import { hasPermissions } from '@learning/core'
import { type RouteDefinition } from '@solidjs/router'
import type { JSX } from '@solidjs/web'
import { createMemo, Show } from 'solid-js'
import { paths } from '../../router'
import banner from './banner.jpg'
import session2 from './matplotlib.jpg'
import session1 from './python.jpg'

export const route = {
  preload() {
    hasPermissions(['draft:read'])
  },
} satisfies RouteDefinition

export default () => {
  const showDrafts = createMemo(() => hasPermissions(['draft:read']))
  return (
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
        </tbody>
      </table>
      <Heading level={2}>Séances d'exercices</Heading>
      <div class="grid gap-2 lg:grid-cols-2">
        <Show when={showDrafts()}>
          <SessionCard index={1} title="Introduction à Python" link="01-python" img={session1} />
          <SessionCard index={2} title="Fonctions et graphiques" link="02-plots" img={session2} />
        </Show>
      </div>
    </>
  )
}

function TD(props: JSX.IntrinsicElements['td']) {
  return <td {...props} class={['px-4', props.class]} />
}

function TH(props: JSX.IntrinsicElements['th']) {
  return <th {...props} class={['px-4', props.class]} />
}

function TR(props: JSX.IntrinsicElements['tr']) {
  return <tr {...props} class={['px-4 even:bg-gray-50', props.class]} />
}

function SessionCard(props: {
  index: number
  title: JSX.Element
  link: keyof typeof paths.MN1M
  img?: string
}) {
  return (
    <a href={paths.MN1M[props.link] as string} class="not-prose no-underline">
      <div class="border border-slate-200 bg-cover bg-center shadow-xs hover:bg-blue-50">
        <Show when={props.img} fallback={<div class="h-48 w-full bg-slate-100" />}>
          <img src={props.img} class="h-48 w-full object-cover opacity-50 hover:opacity-100" />
        </Show>
        <h3 class="px-2 py-4 text-lg font-bold text-stone-700">
          Session {props.index} - {props.title}
        </h3>
      </div>
    </a>
  )
}
