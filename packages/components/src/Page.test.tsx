import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { describe, expect, mock, test } from 'bun:test'
import { createSignal, Show } from 'solid-js'

mock.module('@solidjs/router', () => ({
  useLocation: () => ({ pathname: '/' }),
}))

const { Page } = await import('./Page')
const { Heading } = await import('./Heading')

const tocLinks = () =>
  Array.from(document.querySelectorAll('aside a')).map(
    (a) => `${a.getAttribute('href')} ${a.textContent}`,
  )
const headingIds = () =>
  Array.from(document.querySelectorAll('main :is(h1, h2, h3, h4)')).map(
    (h) => `${h.textContent}#${h.id}`,
  )
const activeLink = () => document.querySelector('aside a.bg-blue-50')?.textContent

const placeAt = (tops: Record<string, number>) => {
  for (const heading of Array.from(
    document.querySelectorAll<HTMLElement>('main :is(h1, h2, h3)'),
  )) {
    const top = tops[heading.textContent!]!
    heading.getBoundingClientRect = () => ({ top }) as DOMRect
  }
  fireEvent.scroll(document)
}

describe('Page table of contents', () => {
  test('lists headings up to level 3 in page order, linked to their ids', async () => {
    render(() => (
      <Page>
        <Heading level={1}>A</Heading>
        <Heading level={2}>B</Heading>
        <Heading level={4}>Hidden</Heading>
        <Heading level={3}>C</Heading>
      </Page>
    ))
    await waitFor(() => expect(tocLinks()).toEqual(['#0 A', '#1 B', '#2 C']))
    expect(headingIds()).toEqual(['A#0', 'B#1', 'Hidden#', 'C#2'])
  })

  test('indents entries by level', async () => {
    render(() => (
      <Page>
        <Heading level={1}>A</Heading>
        <Heading level={2}>B</Heading>
        <Heading level={3}>C</Heading>
      </Page>
    ))
    await waitFor(() => expect(tocLinks()).toHaveLength(3))
    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveClass('pl-2')
    expect(links[1]).toHaveClass('pl-4')
    expect(links[2]).toHaveClass('pl-6')
  })

  test('a heading that appears later takes its place in page order', async () => {
    const [shown, setShown] = createSignal(false)
    render(() => (
      <Page>
        <Heading level={1}>A</Heading>
        <Show when={shown()}>
          <Heading level={2}>B</Heading>
        </Show>
        <Heading level={2}>C</Heading>
      </Page>
    ))
    await waitFor(() => expect(tocLinks()).toEqual(['#0 A', '#1 C']))
    setShown(true)
    await waitFor(() => expect(tocLinks()).toEqual(['#0 A', '#1 B', '#2 C']))
    expect(headingIds()).toEqual(['A#0', 'B#1', 'C#2'])
  })

  test('a heading that unmounts is removed', async () => {
    const [shown, setShown] = createSignal(true)
    render(() => (
      <Page>
        <Heading level={1}>A</Heading>
        <Show when={shown()}>
          <Heading level={2}>B</Heading>
        </Show>
        <Heading level={2}>C</Heading>
      </Page>
    ))
    await waitFor(() => expect(tocLinks()).toEqual(['#0 A', '#1 B', '#2 C']))
    setShown(false)
    await waitFor(() => expect(tocLinks()).toEqual(['#0 A', '#1 C']))
    expect(headingIds()).toEqual(['A#0', 'C#1'])
  })

  test('a heading whose title changes is updated, not added again', async () => {
    const [title, setTitle] = createSignal('Before')
    render(() => (
      <Page>
        <Heading level={1}>{title()}</Heading>
      </Page>
    ))
    await waitFor(() => expect(tocLinks()).toEqual(['#0 Before']))
    setTitle('After')
    await waitFor(() => expect(tocLinks()).toEqual(['#0 After']))
  })

  test('without a page, a heading renders without an id', async () => {
    render(() => <Heading level={2}>Alone</Heading>)
    expect(await screen.findByRole('heading', { level: 2 })).not.toHaveAttribute('id')
  })
})

describe('Page current section', () => {
  const sections = () => (
    <Page>
      <Heading level={1}>A</Heading>
      <Heading level={2}>B</Heading>
      <Heading level={2}>C</Heading>
    </Page>
  )

  test('highlights the last heading scrolled past', async () => {
    render(sections)
    await waitFor(() => expect(tocLinks()).toHaveLength(3))
    placeAt({ A: -500, B: 50, C: 400 })
    await waitFor(() => expect(activeLink()).toBe('B'))
    placeAt({ A: -900, B: -350, C: 0 })
    await waitFor(() => expect(activeLink()).toBe('C'))
    expect(document.querySelectorAll('aside a.bg-blue-50')).toHaveLength(1)
  })

  test('highlights the first heading at the top of the page', async () => {
    render(sections)
    await waitFor(() => expect(tocLinks()).toHaveLength(3))
    placeAt({ A: 200, B: 600, C: 1000 })
    await waitFor(() => expect(activeLink()).toBe('A'))
  })

  test('follows scrolling inside an element', async () => {
    render(sections)
    await waitFor(() => expect(tocLinks()).toHaveLength(3))
    placeAt({ A: -500, B: -100, C: 50 })
    for (const heading of Array.from(document.querySelectorAll<HTMLElement>('main :is(h1, h2)'))) {
      const top = { A: -900, B: 20, C: 400 }[heading.textContent as 'A' | 'B' | 'C']
      heading.getBoundingClientRect = () => ({ top }) as DOMRect
    }
    fireEvent.scroll(document.querySelector('main')!)
    await waitFor(() => expect(activeLink()).toBe('B'))
  })

  test('collapses and expands with the arrow beside it', async () => {
    render(sections)
    await waitFor(() => expect(tocLinks()).toHaveLength(3))
    fireEvent.click(screen.getByLabelText('Masquer la table des matières'))
    await waitFor(() => expect(tocLinks()).toHaveLength(0))
    fireEvent.click(screen.getByLabelText('Afficher la table des matières'))
    await waitFor(() => expect(tocLinks()).toHaveLength(3))
  })
})
