import { render, waitFor } from '@solidjs/testing-library'
import { describe, expect, mock, test } from 'bun:test'
import { createSignal, flush } from 'solid-js'
import { drag } from './jsxgraphStubs'

const { ComplexPlaneInput } = await import('./ComplexPlaneInput')

const boards = () => JXG.boards as Record<string, JXG.Board>
const board = () => Object.values(boards()).at(-1)!
const elements = (type: string) =>
  (board().objectsList as JXG.GeometryElement[]).filter((el) => el.elType === type)
const point = () => elements('point').find((p) => p.getAttribute('snapToGrid')) as JXG.Point
const arrow = () => elements('arrow')[0] as JXG.Line
const xy = (p: JXG.Point) => [p.X() + 0, p.Y() + 0]

async function renderInput(props: Parameters<typeof ComplexPlaneInput>[0] = {}) {
  const before = Object.keys(boards()).length
  render(() => <ComplexPlaneInput {...props} />)
  await waitFor(() => expect(Object.keys(boards()).length).toBeGreaterThan(before))
  await waitFor(() => expect(point()).toBeDefined())
}

describe('ComplexPlaneInput', () => {
  test('starts at 1 with an arrow from the origin', async () => {
    await renderInput()
    expect(xy(point())).toEqual([1, 0])
    expect(xy(arrow().point1)).toEqual([0, 0])
    expect(arrow().point2).toBe(point())
    expect(point().getAttribute('snapSizeX')).toBe(1)
  })

  test('reports where the point is dragged, snapped to the grid', async () => {
    const onChange = mock()
    await renderInput({ onChange, snapSize: 0.5 })
    expect(point().getAttribute('snapSizeX')).toBe(0.5)
    expect(point().getAttribute('snapSizeY')).toBe(0.5)
    drag(point(), [2, -3])
    expect(onChange).toHaveBeenLastCalledWith([2, -3])
  })

  test('follows its value', async () => {
    const [value, setValue] = createSignal<[number, number]>([2, 1])
    await renderInput({
      get value() {
        return value()
      },
    })
    expect(xy(point())).toEqual([2, 1])
    setValue([-1, 3])
    flush()
    await waitFor(() => expect(xy(point())).toEqual([-1, 3]))
  })

  test('hides the ticks without a grid', async () => {
    await renderInput({ grid: false })
    const ticks = elements('ticks')
    expect(ticks.length).toBeGreaterThan(0)
    expect(ticks.every((t) => t.getAttribute('visible') === false)).toBe(true)
  })

  test('shows the ticks with a grid', async () => {
    await renderInput()
    expect(elements('ticks').some((t) => t.getAttribute('visible') !== false)).toBe(true)
  })
})
