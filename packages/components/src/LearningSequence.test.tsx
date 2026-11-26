import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'
import { createSignal, flush } from 'solid-js'
import { CheckPoint, LearningSequence, Steps } from './LearningSequence'

const shown = (...texts: string[]) => texts.filter((text) => screen.queryByText(text) !== null)
const continueButton = () => screen.getByRole('button', { name: 'Continuer à lire ↓' })

describe('LearningSequence', () => {
  test('reveals its parts one checkpoint at a time, keeping earlier ones', async () => {
    render(() => (
      <LearningSequence>
        <section>
          <p>A</p>
          <CheckPoint />
        </section>
        <section>
          <p>B</p>
          <CheckPoint />
        </section>
        <section>
          <p>C</p>
        </section>
      </LearningSequence>
    ))
    await waitFor(() => expect(shown('A', 'B', 'C')).toEqual(['A']))
    fireEvent.click(continueButton())
    await waitFor(() => expect(shown('A', 'B', 'C')).toEqual(['A', 'B']))
    expect(screen.getAllByRole('button')[0]).toBeDisabled()
    fireEvent.click(screen.getAllByRole('button')[1]!)
    await waitFor(() => expect(shown('A', 'B', 'C')).toEqual(['A', 'B', 'C']))
  })

  test('a checkpoint already passed moves on by itself', async () => {
    render(() => (
      <LearningSequence>
        <section>
          <p>A</p>
          <CheckPoint passed />
        </section>
        <section>
          <p>B</p>
        </section>
      </LearningSequence>
    ))
    await waitFor(() => expect(shown('A', 'B')).toEqual(['A', 'B']))
  })

  test('a checkpoint moves on once its condition resolves to true', async () => {
    let resolve!: (passed: boolean) => void
    const passed = new Promise<boolean>((r) => (resolve = r))
    render(() => (
      <LearningSequence>
        <section>
          <p>A</p>
          <CheckPoint passed={() => passed} />
        </section>
        <section>
          <p>B</p>
        </section>
      </LearningSequence>
    ))
    await new Promise((r) => setTimeout(r, 10))
    expect(shown('A', 'B')).toEqual(['A'])
    resolve(true)
    await waitFor(() => expect(shown('A', 'B')).toEqual(['A', 'B']))
  })

  test('a checkpoint whose condition is false stays put', async () => {
    render(() => (
      <LearningSequence>
        <section>
          <p>A</p>
          <CheckPoint passed={() => false} />
        </section>
        <section>
          <p>B</p>
        </section>
      </LearningSequence>
    ))
    await new Promise((r) => setTimeout(r, 10))
    expect(shown('A', 'B')).toEqual(['A'])
  })

  test('a checkpoint can render its own way to move on', async () => {
    render(() => (
      <LearningSequence>
        <section>
          <p>A</p>
          <CheckPoint>{(advance) => <button onClick={advance}>J'ai compris</button>}</CheckPoint>
        </section>
        <section>
          <p>B</p>
        </section>
      </LearningSequence>
    ))
    await waitFor(() => expect(shown('A', 'B')).toEqual(['A']))
    expect(screen.queryByRole('button', { name: 'Continuer à lire ↓' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: "J'ai compris" }))
    await waitFor(() => expect(shown('A', 'B')).toEqual(['A', 'B']))
  })

  test('a checkpoint shows its content once passed', async () => {
    render(() => (
      <LearningSequence>
        <section>
          <p>A</p>
          <CheckPoint>
            <p>Bravo</p>
          </CheckPoint>
        </section>
        <section>
          <p>B</p>
        </section>
      </LearningSequence>
    ))
    await waitFor(() => expect(shown('A', 'Bravo', 'B')).toEqual(['A']))
    fireEvent.click(continueButton())
    await waitFor(() => expect(shown('A', 'Bravo', 'B')).toEqual(['A', 'Bravo', 'B']))
  })

  test('a checkpoint passed by its condition shows its content', async () => {
    render(() => (
      <LearningSequence>
        <section>
          <p>A</p>
          <CheckPoint passed={() => Promise.resolve(true)}>
            <p>Bravo</p>
          </CheckPoint>
        </section>
        <section>
          <p>B</p>
        </section>
      </LearningSequence>
    ))
    await waitFor(() => expect(shown('A', 'Bravo', 'B')).toEqual(['A', 'Bravo', 'B']))
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('Steps', () => {
  const counters = () => screen.getAllByText(/^Étape/).map((el) => el.textContent)
  const next = () => screen.getAllByRole('button', { name: '→' })
  const previous = () => screen.getAllByRole('button', { name: '←' })

  test('shows one step at a time, with a counter above and below', () => {
    render(() => (
      <Steps>
        <p>Un</p>
        <p>Deux</p>
        <p>Trois</p>
      </Steps>
    ))
    expect(shown('Un', 'Deux', 'Trois')).toEqual(['Un'])
    expect(counters()).toEqual(['Étape 1/3', 'Étape 1/3'])
    expect(previous().every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
  })

  test('moves with either pair of buttons and stops at both ends', () => {
    render(() => (
      <Steps>
        <p>Un</p>
        <p>Deux</p>
        <p>Trois</p>
      </Steps>
    ))
    fireEvent.click(next()[0]!)
    flush()
    expect(shown('Un', 'Deux', 'Trois')).toEqual(['Deux'])
    fireEvent.click(next()[1]!)
    flush()
    expect(shown('Un', 'Deux', 'Trois')).toEqual(['Trois'])
    expect(counters()).toEqual(['Étape 3/3', 'Étape 3/3'])
    expect(next().every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    fireEvent.click(previous()[1]!)
    flush()
    expect(shown('Un', 'Deux', 'Trois')).toEqual(['Deux'])
  })

  test('follows steps that are added', () => {
    const [extra, setExtra] = createSignal(false)
    render(() => (
      <Steps>
        <p>Un</p>
        {extra() ? <p>Deux</p> : []}
      </Steps>
    ))
    expect(counters()[0]).toBe('Étape 1/1')
    setExtra(true)
    flush()
    expect(counters()[0]).toBe('Étape 1/2')
  })
})
