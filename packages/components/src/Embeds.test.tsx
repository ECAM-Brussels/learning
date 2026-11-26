import { render, screen } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { Card } from './Card'
import { Geogebra } from './Geogebra'
import { Youtube } from './Youtube'

const iframe = (container: HTMLElement) => container.querySelector('iframe')!

// happy-dom reports every iframe it refuses to load.
let consoleError: ReturnType<typeof spyOn>
beforeEach(() => {
  consoleError = spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => consoleError.mockRestore())

describe('Card', () => {
  test('links its image and content', () => {
    render(() => (
      <Card image="/cover.png" href="/course">
        Cours
      </Card>
    ))
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/course')
    expect(link).toHaveTextContent('Cours')
    expect(link.querySelector('img')).toHaveAttribute('src', '/cover.png')
  })
})

describe('Youtube', () => {
  test('embeds a watch link at 560×315 by default', () => {
    const { container } = render(() => <Youtube src="https://www.youtube.com/watch?v=abc" />)
    expect(iframe(container)).toHaveAttribute('src', 'https://www.youtube.com/embed/abc')
    expect(iframe(container)).toHaveAttribute('width', '560')
    expect(iframe(container)).toHaveAttribute('height', '315')
  })

  test('keeps embed links and scales its size by zoom', () => {
    const { container } = render(() => (
      <Youtube src="https://www.youtube.com/embed/abc" width={400} height={200} zoom={1.5} />
    ))
    expect(iframe(container)).toHaveAttribute('src', 'https://www.youtube.com/embed/abc')
    expect(iframe(container)).toHaveAttribute('width', '600')
    expect(iframe(container)).toHaveAttribute('height', '300')
  })
})

describe('Geogebra', () => {
  test('embeds the material at 900×600 by default', () => {
    const { container } = render(() => <Geogebra id="abc" />)
    expect(iframe(container)).toHaveAttribute('width', '900')
    expect(iframe(container)).toHaveAttribute('height', '600')
    expect(iframe(container).getAttribute('src')).toBe(
      'https://www.geogebra.org/material/iframe/id/abc/width/900/height/600/ai/false/smb/false/stb/false',
    )
  })

  test('sizes the iframe and the material alike', () => {
    const { container } = render(() => (
      <Geogebra id="abc" width={300} height={200} class="mx-auto" />
    ))
    expect(iframe(container)).toHaveAttribute('width', '300')
    expect(iframe(container)).toHaveAttribute('height', '200')
    expect(iframe(container)).toHaveClass('mx-auto')
    expect(iframe(container).getAttribute('src')).toContain('/id/abc/width/300/height/200/')
  })
})
