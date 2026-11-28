import { createProjection, merge } from 'solid-js'

interface GeogebraProps {
  class?: string
  /** In pixels, 600 by default. */
  height?: number
  /** The applet's identifier: the end of its address, `geogebra.org/m/G2yWterN`. */
  id: string
  /** In pixels, 900 by default. */
  width?: number
}

/**
 * A GeoGebra applet, by its identifier: for a ready-made animation, simpler than a `Board`.
 *
 * @example
 * <Geogebra id="G2yWterN" width={800} height={600} />
 */
export function Geogebra(rawProps: GeogebraProps) {
  const props = merge({ height: 600, width: 900 }, rawProps)
  const attrs = createProjection(() => ({
    allowfullscreen: true,
    loading: 'lazy' as const,
    ...props,
    src: `https://www.geogebra.org/material/iframe/id/${props.id}/width/${props.width}/height/${props.height}/ai/false/smb/false/stb/false`,
  }))

  return <iframe {...attrs} />
}
