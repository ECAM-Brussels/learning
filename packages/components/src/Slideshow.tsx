import type { JSX } from 'solid-js/jsx-runtime'

export default function Slideshow(props: { class?: string; children: JSX.Element }) {
  return (
    <div class={['snap-y snap-mandatory overflow-scroll border', props.class ?? 'h-135 w-240']}>
      {props.children}
    </div>
  )
}
