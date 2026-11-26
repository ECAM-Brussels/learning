import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, mock, test } from 'bun:test'
import { createSignal, flush } from 'solid-js'

// mathlive's browser build does not run in happy-dom (and Bun resolves its SSR build):
// stand in with an element offering the part of its API MathField uses.
class FakeMathfield extends HTMLElement {
  #value = ''
  setValues: string[] = []
  get value() {
    return this.#value
  }
  set value(value: string) {
    this.#value = value
  }
  getValue() {
    return this.#value
  }
  setValue(value: string) {
    this.setValues.push(value)
    this.#value = value
  }
}
customElements.define('math-field', FakeMathfield)
mock.module('mathlive', () => ({}))

const { MathField } = await import('./MathField')

const field = (container: HTMLElement) => container.querySelector('math-field') as FakeMathfield

describe('MathField', () => {
  test('shows its value and wraps its placeholder in \\text', () => {
    const { container } = render(() => <MathField value="x^2" placeholder="Réponse" />)
    expect(field(container).getValue()).toBe('x^2')
    expect(field(container)).toHaveAttribute('placeholder', '\\text{Réponse}')
  })

  test('has an empty placeholder by default', () => {
    const { container } = render(() => <MathField value="" />)
    expect(field(container)).toHaveAttribute('placeholder', '\\text{}')
  })

  test('follows its value without resetting what is already shown', () => {
    const [value, setValue] = createSignal('x')
    const { container } = render(() => <MathField value={value()} />)
    const mf = field(container)
    mf.setValues = []
    setValue('y')
    flush()
    expect(mf.getValue()).toBe('y')
    mf.value = 'z'
    mf.setValues = []
    setValue('z')
    flush()
    expect(mf.setValues).toEqual([])
  })

  test('Enter submits its form', () => {
    const onSubmit = mock((e: SubmitEvent) => e.preventDefault())
    const { container } = render(() => (
      <form onSubmit={onSubmit}>
        <MathField value="1" />
      </form>
    ))
    fireEvent.keyDown(field(container), { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  test('Enter outside a form does nothing', () => {
    const { container } = render(() => <MathField value="1" />)
    expect(() => fireEvent.keyDown(field(container), { key: 'Enter' })).not.toThrow()
  })

  test('keeps arrow keys to itself, so they do not change slides', () => {
    const onKeyDown = mock()
    const { container } = render(() => (
      <div onKeyDown={onKeyDown}>
        <MathField value="1" />
      </div>
    ))
    fireEvent.keyDown(field(container), { key: 'ArrowLeft' })
    expect(onKeyDown).not.toHaveBeenCalled()
    fireEvent.keyDown(field(container), { key: 'a' })
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })
})
