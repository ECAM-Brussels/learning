import { type PathEnd } from '@solidjs/router'
import { type JSX } from '@solidjs/web'

export function Card(props: { image: string; href: string | PathEnd; children: JSX.Element }) {
  return (
    <a class="not-prose" href={props.href}>
      <section class="rounded-xl bg-white shadow transition ease-in-out hover:scale-105">
        <img src={props.image} class="h-90 w-full rounded-t-xl object-cover" />
        <div class="prose px-4 py-4">{props.children}</div>
      </section>
    </a>
  )
}
