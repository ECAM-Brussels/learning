import { createProjection, merge } from 'solid-js'

interface GeogebraProps {
  class?: string
  height?: number
  id: string
  width?: number
}

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
