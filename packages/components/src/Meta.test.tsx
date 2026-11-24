import { render, screen, waitFor } from '@solidjs/testing-library'
import { describe, expect, mock, test } from 'bun:test'
import { createSignal, Show } from 'solid-js'

mock.module('@solidjs/router', () => ({
  useLocation: () => ({ pathname: '/course/page' }),
}))

const { Meta, defineMeta } = await import('./Meta')
const { BreadCrumbs } = await import('./Breadcrumbs')
const { Example, Definition } = await import('./Environment')

const trail = () =>
  Array.from(document.querySelectorAll('ul a')).map(
    (a) => `${a.textContent} ${a.getAttribute('href')}`,
  )

describe('Meta', () => {
  test('BreadCrumbs shows the trail of the Meta levels, even when rendered above them', async () => {
    const Page = defineMeta({ title: 'Page' })
    render(() => (
      <Meta href="/" title="Home">
        <BreadCrumbs />
        <Meta href="/course" title="Course">
          <Page>
            <p>Content</p>
          </Page>
        </Meta>
      </Meta>
    ))
    await waitFor(() => expect(trail()).toEqual(['Home /', 'Course /course', 'Page /course/page']))
  })

  test('the trail follows titles and levels that come and go', async () => {
    const [title, setTitle] = createSignal('Course')
    const [shown, setShown] = createSignal(true)
    render(() => (
      <Meta href="/" title="Home">
        <BreadCrumbs />
        <Meta href="/course" title={title()}>
          <Show when={shown()}>
            <Meta title="Page">
              <p>Content</p>
            </Meta>
          </Show>
        </Meta>
      </Meta>
    ))
    await waitFor(() => expect(trail()).toHaveLength(3))
    setTitle('Renamed')
    await waitFor(() => expect(trail()[1]).toBe('Renamed /course'))
    setShown(false)
    await waitFor(() => expect(trail()).toEqual(['Home /', 'Renamed /course']))
  })

  test('the browser tab shows the innermost title after the inherited prefix', async () => {
    render(() => (
      <Meta href="/" title="Home" prefix="Learning -">
        <Meta title="Page">
          <p>Content</p>
        </Meta>
      </Meta>
    ))
    await waitFor(() => expect(document.title).toBe('Learning - Page'))
  })

  test('hides the page from who may not see it, in its language', async () => {
    render(() => (
      <Meta title="Page" lang="en" authorized={() => false}>
        <p>Secret</p>
      </Meta>
    ))
    await waitFor(() => expect(screen.getByText('You are not allowed to see this page')))
    expect(screen.queryByText('Secret')).toBeNull()
  })
})

describe('language', () => {
  const label = (text: string) => screen.getByText(text, { selector: 'h3' })

  test('environments are labelled in French by default', () => {
    render(() => (
      <>
        <Example>a</Example>
        <Meta title="Page">
          <Definition>b</Definition>
        </Meta>
      </>
    ))
    expect(label('Exemple')).toBeTruthy()
    expect(label('Définition')).toBeTruthy()
  })

  test('environments follow the language of their page, which inner pages inherit or override', () => {
    render(() => (
      <Meta title="Course" lang="en">
        <Example>a</Example>
        <Meta title="Page">
          <Definition>b</Definition>
        </Meta>
        <Meta title="Page en français" lang="fr">
          <Definition>c</Definition>
        </Meta>
      </Meta>
    ))
    expect(label('Example')).toBeTruthy()
    expect(label('Definition')).toBeTruthy()
    expect(label('Définition')).toBeTruthy()
  })
})
