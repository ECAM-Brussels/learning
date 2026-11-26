import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'
import type { ExerciseStats as Stats } from './context'

await import('./test.mocks')
const { ExerciseStats, SequenceStats } = await import('./stats')

const student = (name: string, correct: boolean | null, submitted = correct !== null) => ({
  email: `${name.toLowerCase()}@ecam.be`,
  name,
  correct,
  submitted,
})

function source(first: Stats) {
  let push: (stats: Stats) => void = () => {}
  let connections = 0
  let closed = 0
  async function* watch() {
    connections++
    try {
      yield first
      while (true) yield await new Promise<Stats>((resolve) => (push = resolve))
    } finally {
      closed++
    }
  }
  return {
    watch,
    push: (stats: Stats) => push(stats),
    get connections() {
      return connections
    },
    get closed() {
      return closed
    },
  }
}

const open = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Montrer les statistiques de cet exercice' }))

describe('ExerciseStats', () => {
  test('connects only once opened', async () => {
    const stats = source({ students: [] })
    render(() => <ExerciseStats watch={stats.watch} />)
    expect(stats.connections).toBe(0)
    open()
    expect(await screen.findByText("Aucun étudiant n'a encore ouvert cet exercice.")).toBeTruthy()
    expect(stats.connections).toBe(1)
  })

  test('counts students by status and lists them', async () => {
    const stats = source({
      students: [
        student('Alice', true),
        student('Bob', false),
        student('Chloé', null, true),
        student('David', null),
      ],
    })
    render(() => <ExerciseStats watch={stats.watch} />)
    open()
    const bar = await screen.findByRole('img')
    expect(bar.getAttribute('aria-label')).toBe(
      'Réussi : 1, Échoué : 1, En cours : 1, Pas encore répondu : 1',
    )
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('david@ecam.be')).toBeTruthy()
  })

  test('follows new values from the live source', async () => {
    const stats = source({ students: [student('Alice', null)] })
    render(() => <ExerciseStats watch={stats.watch} />)
    open()
    await screen.findByRole('img')
    stats.push({ students: [student('Alice', true), student('Bob', false)] })
    await waitFor(() =>
      expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Réussi : 1, Échoué : 1'),
    )
  })

  test('disconnects when closed', async () => {
    const stats = source({ students: [student('Alice', true)] })
    render(() => <ExerciseStats watch={stats.watch} />)
    open()
    await screen.findByRole('img')
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    await waitFor(() => expect(screen.queryByRole('img')).toBeNull())
    stats.push({ students: [] })
    await waitFor(() => expect(stats.closed).toBe(1))
  })
})

describe('SequenceStats', () => {
  const openProgress = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Montrer la progression des étudiants' }))

  test('fetches only once opened and shows each student by exercise', async () => {
    let fetches = 0
    const fetch = async () => {
      fetches++
      return [
        {
          email: 'alice@ecam.be',
          name: 'Alice',
          progress: [
            { i: 0, correct: true },
            { i: 1, correct: false },
            { i: 2, correct: null },
          ],
        },
        { email: 'bob@ecam.be', name: 'Bob', progress: [{ i: 0, correct: true }] },
      ]
    }
    render(() => <SequenceStats fetch={fetch} />)
    expect(fetches).toBe(0)
    openProgress()
    const alice = (await screen.findByText('Alice')).closest('tr')!
    expect(fetches).toBe(1)
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Nom',
      '1',
      '2',
      '3',
      'Réussis',
    ])
    expect(Array.from(alice.querySelectorAll('td')).map((td) => td.textContent)).toEqual([
      'Alice',
      '✓',
      '✗',
      '…',
      '1 / 2',
    ])
    const bob = screen.getByText('Bob').closest('tr')!
    expect(Array.from(bob.querySelectorAll('td')).map((td) => td.textContent)).toEqual([
      'Bob',
      '✓',
      '',
      '',
      '1 / 1',
    ])
  })

  test('says when nobody has started', async () => {
    render(() => <SequenceStats fetch={async () => []} />)
    openProgress()
    expect(await screen.findByText("Aucun étudiant n'a encore commencé cette série.")).toBeTruthy()
  })
})
