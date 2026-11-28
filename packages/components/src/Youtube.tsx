type YoutubeProps = {
  class?: string
  /** In pixels, 315 by default. */
  height?: number
  /** The video's address, as copied from YouTube. */
  src: string
  /** In pixels, 560 by default. */
  width?: number
  /** Scales the video, `1` by default. */
  zoom?: number
}

/**
 * A YouTube video, by its address.
 *
 * @example
 * <Youtube src="https://www.youtube.com/watch?v=WUvTyaaNkzM" class="mx-auto" />
 */
export function Youtube(props: YoutubeProps) {
  return (
    <iframe
      class={props.class}
      width={(props.width || 560) * (props.zoom || 1)}
      height={(props.height || 315) * (props.zoom || 1)}
      src={props.src.replace('watch?v=', 'embed/')}
      allow="autoplay; encrypted-media"
      allowfullscreen
    />
  )
}
