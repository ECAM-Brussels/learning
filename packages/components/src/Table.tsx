import { faFileExcel } from '@fortawesome/free-solid-svg-icons'
import type { JSX } from '@solidjs/web'
import { createMemo, createSignal, For, Show } from 'solid-js'
import { Fa } from './Fa'

export type TableValue = string | number | boolean | null | undefined

export type TableColumn<T> = {
  /** Identifies the column across updates, so that its sorting and filter survive them. */
  id: string
  header: JSX.Element
  /** Names the column for its filter when `header` is not plain text. */
  label?: string
  /** What the column sorts and filters by, and shows unless `cell` is given. */
  value: (row: T) => TableValue
  /** Label of a value, in cells and in the options of a `select` filter. */
  format?: (value: TableValue) => string
  cell?: (row: T) => JSX.Element
  sortable?: boolean
  /**
   * `text` keeps rows whose label contains the typed text, ignoring case and accents;
   * `select` offers the distinct values of the column.
   */
  filter?: 'text' | 'select'
  align?: 'left' | 'center' | 'right'
  class?: string
}

const arrows = { ascending: ' ▲', descending: ' ▼', none: '' } as const

type Sort = { id: string; direction: 'ascending' | 'descending' }

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const isEmpty = (value: TableValue) => value === null || value === undefined || value === ''

/** Compares values, multiplied by `sign`, except that empty values always come last. */
function compare(a: TableValue, b: TableValue, sign = 1) {
  if (isEmpty(a) || isEmpty(b)) return Number(isEmpty(a)) - Number(isEmpty(b))
  if (typeof a === 'string' && typeof b === 'string') return sign * collator.compare(a, b)
  return sign * (Number(a) - Number(b))
}

const defaultFormat = (value: TableValue) => (isEmpty(value) ? '' : String(value))

const alignment = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

const columnLabel = <T,>(column: TableColumn<T>) =>
  column.label ?? (typeof column.header === 'string' ? column.header : column.id)

/**
 * The rows as an Excel sheet, under a bold header.
 * A cell holds the label the table shows, except that a number shown as is stays a number, to compute with.
 */
export function tableToSheet<T>(columns: readonly TableColumn<T>[], rows: readonly T[]) {
  const cells = rows.map((row) =>
    columns.map((column) => {
      const value = column.value(row)
      if (!column.format && typeof value === 'number') return value
      return (column.format ?? defaultFormat)(value) || null
    }),
  )
  const headers = columns.map(columnLabel)
  const widths = columns.map((_, i) =>
    Math.min(
      50,
      Math.max(8, headers[i]!.length, ...cells.map((row) => String(row[i] ?? '').length)) + 2,
    ),
  )
  return {
    data: [headers.map((value) => ({ value, fontWeight: 'bold' as const })), ...cells],
    columns: widths.map((width) => ({ width })),
  }
}

export function Table<T>(props: {
  rows: readonly T[]
  columns: readonly TableColumn<T>[]
  key: (row: T) => unknown
  /** Shown when there are no rows at all, as opposed to none left by the filters. */
  empty?: JSX.Element
  /** Offers to download the rows left by the filters, in their order, as `exportName.xlsx`. */
  exportName?: string
  class?: string
}) {
  const [sort, setSort] = createSignal<Sort | null>(null, { name: 'table-sort' })
  const [filters, setFilters] = createSignal<Record<string, string>>({}, { name: 'table-filters' })

  const format = (column: TableColumn<T>, value: TableValue) =>
    (column.format ?? defaultFormat)(value)
  // Options and selections are keyed by String(value), as <option> values are strings
  const optionKey = (value: TableValue) => (isEmpty(value) ? '' : String(value))

  const visible = createMemo(
    () => {
      const active = props.columns.filter((column) => column.filter && filters()[column.id])
      let rows = props.rows.filter((row) =>
        active.every((column) => {
          const wanted = filters()[column.id]!
          const value = column.value(row)
          if (column.filter === 'select') return `=${optionKey(value)}` === wanted
          return normalize(format(column, value)).includes(normalize(wanted))
        }),
      )
      const current = sort()
      const column = current && props.columns.find((column) => column.id === current.id)
      if (column) {
        const sign = current.direction === 'ascending' ? 1 : -1
        rows = rows.toSorted((a, b) => compare(column.value(a), column.value(b), sign))
      }
      return rows
    },
    { name: 'table-rows' },
  )

  const toggleSort = (id: string) =>
    setSort((current) => {
      if (current?.id !== id) return { id, direction: 'ascending' }
      if (current.direction === 'ascending') return { id, direction: 'descending' }
      return null
    })

  const setFilter = (id: string, value: string) =>
    setFilters((filters) => ({ ...filters, [id]: value }))

  const options = (column: TableColumn<T>) => {
    const values = new Map<string, TableValue>()
    for (const row of props.rows) {
      const value = column.value(row)
      values.set(optionKey(value), value)
    }
    return [...values.values()].toSorted((a, b) => compare(a, b))
  }

  const label = columnLabel<T>

  const download = async () => {
    const { default: writeExcelFile } = await import('write-excel-file/browser')
    const sheet = tableToSheet(props.columns, visible())
    await writeExcelFile(sheet.data, { columns: sheet.columns, stickyRowsCount: 1 }).toFile(
      `${props.exportName}.xlsx`,
    )
  }

  const hasFilters = () => props.columns.some((column) => column.filter)

  return (
    <Show when={props.rows.length > 0} fallback={props.empty}>
      <div class={['overflow-x-auto', props.class]}>
        <table class="w-full text-left text-sm">
          <thead class="text-gray-500">
            <tr>
              <For each={props.columns} keyed={(column) => column.id}>
                {(column) => {
                  const direction = () =>
                    sort()?.id === column().id ? sort()!.direction : undefined
                  return (
                    <th
                      class={['px-1 py-1', alignment[column().align ?? 'left'], column().class]}
                      aria-sort={direction() ?? 'none'}
                    >
                      <Show when={column().sortable !== false} fallback={column().header}>
                        <button
                          class="cursor-pointer font-bold whitespace-nowrap hover:text-gray-800"
                          onClick={() => toggleSort(column().id)}
                        >
                          {column().header}
                          {arrows[direction() ?? 'none']}
                        </button>
                      </Show>
                    </th>
                  )
                }}
              </For>
            </tr>
            <Show when={hasFilters()}>
              <tr>
                <For each={props.columns} keyed={(column) => column.id}>
                  {(column) => (
                    <td class="px-1 pb-2">
                      <Show when={column().filter === 'text'}>
                        <input
                          type="search"
                          class="w-full min-w-16 rounded border border-gray-200 px-1 py-0.5 font-normal"
                          placeholder="Filtrer"
                          aria-label={`Filtrer par ${label(column())}`}
                          value={filters()[column().id] ?? ''}
                          onInput={(e) => setFilter(column().id, e.currentTarget.value)}
                        />
                      </Show>
                      <Show when={column().filter === 'select'}>
                        <select
                          class="w-full rounded border border-gray-200 px-0.5 py-0.5 font-normal"
                          aria-label={`Filtrer par ${label(column())}`}
                          value={filters()[column().id] ?? ''}
                          onChange={(e) => setFilter(column().id, e.currentTarget.value)}
                        >
                          <option value="">Tous</option>
                          <For each={options(column())}>
                            {(value) => (
                              <option value={`=${optionKey(value)}`}>
                                {format(column(), value) || '—'}
                              </option>
                            )}
                          </For>
                        </select>
                      </Show>
                    </td>
                  )}
                </For>
              </tr>
            </Show>
          </thead>
          <tbody>
            <For
              each={visible()}
              keyed={props.key}
              fallback={
                <tr>
                  <td colspan={props.columns.length} class="py-2 text-center text-gray-500">
                    Aucune ligne ne correspond aux filtres.
                  </td>
                </tr>
              }
            >
              {(row) => (
                <tr class="border-t border-gray-100">
                  <For each={props.columns} keyed={(column) => column.id}>
                    {(column) => (
                      <td
                        class={['px-1 py-1', alignment[column().align ?? 'left'], column().class]}
                      >
                        {column().cell
                          ? column().cell!(row())
                          : format(column(), column().value(row()))}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <div class="mt-1 flex items-center justify-between gap-4 text-xs text-gray-500">
        <Show when={visible().length !== props.rows.length}>
          <p>
            {visible().length} ligne{visible().length > 1 ? 's' : ''} sur {props.rows.length}
          </p>
        </Show>
        <Show when={props.exportName}>
          <button
            type="button"
            class="ml-auto flex cursor-pointer items-center gap-1 rounded px-2 py-1 hover:bg-gray-100 hover:text-gray-800"
            onClick={() => void download()}
          >
            <Fa icon={faFileExcel} />
            Exporter vers Excel
          </button>
        </Show>
      </div>
    </Show>
  )
}
