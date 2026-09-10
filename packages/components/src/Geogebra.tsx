import { createProjection } from 'solid-js'

interface GeogebraProps {
  class?: string
  height?: number
  id: string
  width?: number
}

export function Geogebra(props: GeogebraProps) {
  const attrs = createProjection(
    () => ({
      allowfullscreen: true,
      loading: 'lazy' as const,
      height: 600,
      width: 900,
      ...props,
      src: `https://www.geogebra.org/material/iframe/id/${props.id}/width/${props.width}/height/${props.height}/ai/false/smb/false/stb/false`,
    }),
    {},
  )

  return <iframe {...attrs} />
}
