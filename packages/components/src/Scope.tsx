import { Loading } from '@solidjs/web'
import type { JSX } from 'solid-js/jsx-runtime'

export default function Scope(props: { children: () => JSX.Element }) {
  return <Loading>{props.children()}</Loading>
}
