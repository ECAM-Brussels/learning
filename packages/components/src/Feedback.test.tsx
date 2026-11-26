import { render, screen, waitFor } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'
import { createMemo, createSignal, flush } from 'solid-js'
import { Attempt } from './Attempt'
import { CheckMark } from './CheckMark'
import { Feedback } from './Feedback'
import { FeedbackContext } from './FeedbackContext'

const mark = (container: HTMLElement) =>
  container.querySelector('.text-green-700')
    ? '✓'
    : container.querySelector('.text-red-900')
      ? '❌'
      : ''

describe('CheckMark', () => {
  test('shows a check, a cross or nothing, and follows its value', () => {
    const [value, setValue] = createSignal<boolean | undefined>(true)
    const { container } = render(() => <CheckMark value={value()} />)
    expect(container.textContent).toBe('✓')
    setValue(false)
    flush()
    expect(container.textContent).toBe('❌')
    setValue(undefined)
    flush()
    expect(container.textContent).toBe('')
  })
})

describe('Attempt', () => {
  test('shows its content and whether it is correct', () => {
    const { container } = render(() => <Attempt correct>Réponse</Attempt>)
    expect(container).toHaveTextContent('Réponse')
    expect(mark(container)).toBe('✓')
  })

  test('takes correctness from the feedback context', () => {
    const { container } = render(() => (
      <FeedbackContext value={{ correct: false }}>
        <Attempt>Réponse</Attempt>
      </FeedbackContext>
    ))
    expect(mark(container)).toBe('❌')
  })

  test('its own correctness wins over the context', () => {
    const { container } = render(() => (
      <FeedbackContext value={{ correct: false }}>
        <Attempt correct>Réponse</Attempt>
      </FeedbackContext>
    ))
    expect(mark(container)).toBe('✓')
  })

  test('shows nothing while ungraded', () => {
    const { container } = render(() => <Attempt>Réponse</Attempt>)
    expect(mark(container)).toBe('')
    expect(container).not.toHaveTextContent('...')
  })

  test('keeps its content while the grade is computed, then shows it', async () => {
    let resolve!: (value: boolean) => void
    const grade = new Promise<boolean>((r) => (resolve = r))
    const { container } = render(() => {
      const correct = createMemo(() => grade)
      return <Attempt correct={correct()}>Réponse</Attempt>
    })
    expect(container).toHaveTextContent('Réponse')
    expect(mark(container)).toBe('')
    resolve(true)
    await waitFor(() => expect(mark(container)).toBe('✓'))
  })
})

describe('Feedback', () => {
  const border = () => screen.getByRole('group')

  test.each([
    ['true', true, 'border-l-green-900'],
    ['false', false, 'border-l-red-900'],
    ['a function', () => true, 'border-l-green-900'],
  ] as const)('colours its border from correct = %s', (_, correct, cls) => {
    render(() => <Feedback correct={correct}>Bravo</Feedback>)
    expect(border()).toHaveClass(cls)
    expect(border()).toHaveAttribute('open')
    expect(screen.getByText('Feedback')).toBeInTheDocument()
    expect(screen.getByText('Bravo')).toBeInTheDocument()
  })

  test('is neutral while ungraded', () => {
    render(() => <Feedback>Indice</Feedback>)
    expect(border()).not.toHaveClass('border-l-green-900')
    expect(border()).not.toHaveClass('border-l-red-900')
  })

  test('takes correctness from the feedback context', () => {
    render(() => (
      <FeedbackContext value={{ correct: false }}>
        <Feedback>Raté</Feedback>
      </FeedbackContext>
    ))
    expect(border()).toHaveClass('border-l-red-900')
  })

  test('follows a correctness that changes', () => {
    const [correct, setCorrect] = createSignal<boolean | undefined>(undefined)
    render(() => <Feedback correct={correct}>Texte</Feedback>)
    setCorrect(true)
    flush()
    expect(border()).toHaveClass('border-l-green-900')
    expect(screen.getByText('Feedback')).toHaveClass('text-green-900')
  })
})
