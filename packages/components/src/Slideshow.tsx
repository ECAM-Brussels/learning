import type { JSX } from 'solid-js/jsx-runtime'

/**
 * Slideshow component to display a series of slides
 *
 * Each child of `<Slideshow>` should be a `<Slide>`.
 *
 * @example
 * <Slideshow>
 *   <Slide title="Hello">
 *     <p>Hello world!</p>
 *   </Slide>
 *   <Slide title="Goodbye">
 *     <p>Goodbye world!</p>
 *   </Slide>
 * </Slideshow>
 */
export default function Slideshow(props: { class?: string; children: JSX.Element }) {
  return (
    <div class={['snap-y snap-mandatory overflow-scroll border', props.class ?? 'h-270 w-480']}>
      {props.children}
    </div>
  )
}
