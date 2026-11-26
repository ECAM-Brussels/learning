import { fireEvent, render, screen } from '@solidjs/testing-library'
import { describe, expect, test } from 'bun:test'
import { createSignal, flush } from 'solid-js'
import { Table, type TableColumn } from './Table'

type Row = { name: string; score?: number; passed: boolean }

const rows: Row[] = [
  { name: 'Émile', score: 12, passed: true },
  { name: 'alice', score: 9, passed: false },
  { name: 'Bob', passed: false },
  { name: 'Chloé', score: 15, passed: true },
]

const columns: TableColumn<Row>[] = [
  { id: 'name', header: 'Nom', value: (row) => row.name, filter: 'text' },
  { id: 'score', header: 'Note', value: (row) => row.score },
  {
    id: 'passed',
    header: 'Résultat',
    value: (row) => row.passed,
    format: (passed) => (passed ? 'Réussi' : 'Échoué'),
    filter: 'select',
  },
]

const names = () =>
  screen
    .getAllByRole('row')
    .slice(2)
    .map((row) => row.querySelector('td')!.textContent)
const sortBy = (header: string) => {
  fireEvent.click(screen.getByRole('button', { name: header }))
  flush()
}

describe('Table', () => {
  test('shows rows in the given order, with formatted values', () => {
    render(() => <Table rows={rows} columns={columns} key={(row) => row.name} />)
    expect(names()).toEqual(['Émile', 'alice', 'Bob', 'Chloé'])
    expect(screen.getAllByText('Réussi').length).toBeGreaterThan(0)
  })

  test('sorts ascending, then descending, then back to the given order', () => {
    render(() => <Table rows={rows} columns={columns} key={(row) => row.name} />)
    sortBy('Nom')
    expect(names()).toEqual(['alice', 'Bob', 'Chloé', 'Émile'])
    expect(screen.getAllByRole('columnheader')[0]!.getAttribute('aria-sort')).toBe('ascending')
    sortBy('Nom ▲')
    expect(names()).toEqual(['Émile', 'Chloé', 'Bob', 'alice'])
    sortBy('Nom ▼')
    expect(names()).toEqual(['Émile', 'alice', 'Bob', 'Chloé'])
    expect(screen.getAllByRole('columnheader')[0]!.getAttribute('aria-sort')).toBe('none')
  })

  test('keeps empty values last in both directions', () => {
    render(() => <Table rows={rows} columns={columns} key={(row) => row.name} />)
    sortBy('Note')
    expect(names()).toEqual(['alice', 'Émile', 'Chloé', 'Bob'])
    sortBy('Note ▲')
    expect(names()).toEqual(['Chloé', 'Émile', 'alice', 'Bob'])
  })

  test('filters text ignoring case and accents', () => {
    render(() => <Table rows={rows} columns={columns} key={(row) => row.name} />)
    const input = screen.getByRole('searchbox', { name: 'Filtrer par Nom' }) as HTMLInputElement
    input.value = 'EMI'
    fireEvent.input(input)
    flush()
    expect(names()).toEqual(['Émile'])
    expect(screen.getByText('1 ligne sur 4')).toBeTruthy()
  })

  test('filters by a value chosen among those of the column', () => {
    render(() => <Table rows={rows} columns={columns} key={(row) => row.name} />)
    const select = screen.getByRole('combobox', {
      name: 'Filtrer par Résultat',
    }) as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'Tous',
      'Échoué',
      'Réussi',
    ])
    select.value = '=false'
    fireEvent.change(select)
    flush()
    expect(names()).toEqual(['alice', 'Bob'])
  })

  test('says when the filters leave no row', () => {
    render(() => <Table rows={rows} columns={columns} key={(row) => row.name} />)
    const input = screen.getByRole('searchbox', { name: 'Filtrer par Nom' }) as HTMLInputElement
    input.value = 'zz'
    fireEvent.input(input)
    flush()
    expect(screen.getByText('Aucune ligne ne correspond aux filtres.')).toBeTruthy()
  })

  test('shows the empty fallback without rows', () => {
    render(() => <Table rows={[]} columns={columns} key={(row) => row.name} empty="Rien" />)
    expect(screen.getByText('Rien')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  test('keeps sorting and filters when rows change', () => {
    const [current, setCurrent] = createSignal(rows)
    render(() => <Table rows={current()} columns={columns} key={(row) => row.name} />)
    sortBy('Nom')
    const select = screen.getByRole('combobox', {
      name: 'Filtrer par Résultat',
    }) as HTMLSelectElement
    select.value = '=true'
    fireEvent.change(select)
    flush()
    setCurrent([...rows, { name: 'Anna', score: 18, passed: true }])
    flush()
    expect(names()).toEqual(['Anna', 'Chloé', 'Émile'])
  })
})
