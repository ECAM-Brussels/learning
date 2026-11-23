import type { JSX } from '@solidjs/web'
import { Errored, Loading } from 'solid-js'

export function Boundary(props: { children: JSX.Element; fallback?: JSX.Element; on?: unknown }) {
  return (
    <Errored
      fallback={(err) => {
        console.error(err())
        return (
          <details open>
            <summary>Erreur</summary>
            {String(err())}
            <pre>{JSON.stringify(err(), null, 2)}</pre>
          </details>
        )
      }}
    >
      <Loading on={props.on} fallback={props.fallback}>
        {props.children}
      </Loading>
    </Errored>
  )
}
