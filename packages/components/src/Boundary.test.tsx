import { render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { createMemo, createSignal, flush, useContext } from 'solid-js'
import { Boundary } from './Boundary'
import { Form, FormState } from './Form'
import { Scope } from './Scope'

function Throws(): never {
  throw new Error('Boom')
}

describe('Boundary', () => {
  let consoleError: ReturnType<typeof spyOn>
  beforeEach(() => {
    consoleError = spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => consoleError.mockRestore())

  test('shows its content', () => {
    render(() => <Boundary>Contenu</Boundary>)
    expect(screen.getByText('Contenu')).toBeInTheDocument()
  })

  test('shows and logs an error thrown inside', () => {
    render(() => (
      <Boundary>
        <Throws />
      </Boundary>
    ))
    expect(screen.getByText('Erreur')).toBeInTheDocument()
    expect(screen.getByRole('group')).toHaveTextContent('Error: Boom')
    expect(consoleError).toHaveBeenCalled()
  })

  test('shows its fallback while its content loads', async () => {
    let resolve!: (value: string) => void
    const text = new Promise<string>((r) => (resolve = r))
    render(() => (
      <Boundary fallback={<p>Chargement</p>}>
        {(() => {
          const value = createMemo(() => text)
          return <p>{value()}</p>
        })()}
      </Boundary>
    ))
    expect(screen.getByText('Chargement')).toBeInTheDocument()
    resolve('Prêt')
    await waitFor(() => expect(screen.getByText('Prêt')).toBeInTheDocument())
    expect(screen.queryByText('Chargement')).toBeNull()
  })
})

describe('Form', () => {
  function ReadOnly() {
    const state = useContext(FormState)
    return <output>{String(state().readOnly ?? false)}</output>
  }

  test('passes attributes to the form and the class to its fieldset', () => {
    const { container } = render(() => (
      <Form id="answer" class="grid">
        <input />
      </Form>
    ))
    expect(container.querySelector('form')).toHaveAttribute('id', 'answer')
    expect(container.querySelector('form')).not.toHaveClass('grid')
    expect(container.querySelector('fieldset')).toHaveClass('grid')
  })

  test('readOnly disables its fields and tells them through FormState', () => {
    const [readOnly, setReadOnly] = createSignal(false)
    const { container } = render(() => (
      <Form readOnly={readOnly()}>
        <ReadOnly />
      </Form>
    ))
    expect(container.querySelector('fieldset')).not.toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('false')
    setReadOnly(true)
    flush()
    expect(container.querySelector('fieldset')).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('true')
  })

  test('FormState is not read-only outside a form', () => {
    render(() => <ReadOnly />)
    expect(screen.getByRole('status')).toHaveTextContent('false')
  })
})

describe('Scope', () => {
  test('runs its function once and keeps the signals it creates', () => {
    let runs = 0
    let increment!: () => void
    render(() => (
      <Scope>
        {() => {
          runs++
          const [count, setCount] = createSignal(0)
          increment = () => setCount((c) => c + 1)
          return <p>{count()}</p>
        }}
      </Scope>
    ))
    increment()
    increment()
    flush()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(runs).toBe(1)
  })
})
