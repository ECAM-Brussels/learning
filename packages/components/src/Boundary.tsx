import type { JSX } from '@solidjs/web'
import { Errored, Loading } from 'solid-js'

export function Boundary(props: { children: JSX.Element; fallback?: JSX.Element }) {
  return (
    <Errored
      fallback={(err) => (
        <details open>
          <summary>Erreur</summary>
          {String(err())}
          <pre>{JSON.stringify(err(), null, 2)}</pre>
        </details>
      )}
    >
      <Loading fallback={props.fallback}>{props.children}</Loading>
    </Errored>
  )
}
