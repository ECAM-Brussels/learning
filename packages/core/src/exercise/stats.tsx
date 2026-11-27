import { Modal, Table, type TableColumn } from '@learning/components'
import { createMemo, For, Show } from 'solid-js'
import type { ExerciseContext, ExerciseStats as Stats } from './context'

type SequenceProgress = Awaited<ReturnType<NonNullable<ExerciseContext['getStats']>>>

type Student = Stats['students'][number]
type Status = 'correct' | 'incorrect' | 'started' | 'opened'

const statuses = {
  correct: { label: 'Réussi', bar: 'bg-green-600', badge: 'bg-green-100 text-green-800' },
  incorrect: { label: 'Échoué', bar: 'bg-red-600', badge: 'bg-red-100 text-red-800' },
  started: { label: 'En cours', bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-800' },
  opened: { label: 'Pas encore répondu', bar: 'bg-gray-300', badge: 'bg-gray-100 text-gray-600' },
} as const satisfies Record<Status, { label: string; bar: string; badge: string }>

function statusOf(student: Student): Status {
  if (student.correct === true) return 'correct'
  if (student.correct === false) return 'incorrect'
  return student.submitted ? 'started' : 'opened'
}

export function ExerciseStats(props: { watch: () => AsyncIterable<Stats> }) {
  return (
    <Modal
      trigger="Montrer les statistiques de cet exercice"
      title="Statistiques de l'exercice"
      fallback="Chargement des statistiques..."
    >
      <StatsContent watch={props.watch} />
    </Modal>
  )
}

export function SequenceStats(props: { fetch: () => Promise<SequenceProgress> }) {
  return (
    <Modal
      trigger="Montrer la progression des étudiants"
      title="Progression des étudiants"
      fallback="Chargement des statistiques..."
      width="max-w-4xl"
    >
      <SequenceTable fetch={props.fetch} />
    </Modal>
  )
}

const results = [
  { symbol: '✗', class: 'bg-red-100 text-red-800' },
  { symbol: '…', class: 'bg-gray-100 text-gray-500' },
  { symbol: '✓', class: 'bg-green-100 text-green-800' },
] as const

/** Ranks a result so that sorting goes from failed to succeeded, with unreached exercises last. */
function rankResult(correct: boolean | null | undefined) {
  if (correct === undefined) return undefined
  if (correct === null) return 1
  return correct ? 2 : 0
}

function SequenceTable(props: { fetch: () => Promise<SequenceProgress> }) {
  const progress = createMemo(() => props.fetch(), { name: 'sequenceStats' })
  const students = createMemo(() =>
    progress().map((student) => ({
      ...student,
      results: new Map(student.progress.map(({ i, correct }) => [i, rankResult(correct)])),
      correct: student.progress.filter(({ correct }) => correct === true).length,
      answered: student.progress.filter(({ correct }) => correct !== null).length,
    })),
  )
  type Row = ReturnType<typeof students>[number]
  const columns = createMemo((): TableColumn<Row>[] => {
    const last = Math.max(-1, ...progress().flatMap((s) => s.progress.map(({ i }) => i)))
    const exercises = Array.from({ length: last + 1 }, (_, i): TableColumn<Row> => ({
      id: `exercise-${i}`,
      header: String(i + 1),
      label: `exercice ${i + 1}`,
      value: (row) => row.results.get(i),
      format: (rank) => (typeof rank === 'number' ? results[rank]!.symbol : ''),
      cell: (row) => {
        const rank = row.results.get(i)
        if (rank === undefined) return null
        return (
          <span class={['block rounded px-1 py-0.5 font-bold', results[rank]!.class]}>
            {results[rank]!.symbol}
          </span>
        )
      },
      filter: 'select',
      align: 'center',
      class: 'w-12',
    }))
    return [
      {
        id: 'name',
        header: 'Nom',
        value: (row) => row.name,
        filter: 'text',
        class: 'whitespace-nowrap',
      },
      ...exercises,
      {
        id: 'correct',
        header: 'Réussis',
        value: (row) => row.correct,
        cell: (row) => `${row.correct} / ${row.answered}`,
        align: 'right',
        class: 'whitespace-nowrap',
      },
    ]
  })

  return (
    <>
      <Table
        rows={students()}
        columns={columns()}
        key={(row) => row.email}
        exportName="progression"
        empty={<p class="text-gray-500">Aucun étudiant n'a encore commencé cette série.</p>}
      />
      <Show when={students().length > 0}>
        <p class="mt-2 text-xs text-gray-500">
          ✓ réussi, ✗ échoué, … commencé sans réponse complète. La dernière colonne compte les
          exercices réussis parmi ceux auxquels l'étudiant a répondu.
        </p>
      </Show>
    </>
  )
}

const statusOrder = Object.keys(statuses) as Status[]

const studentColumns: TableColumn<Student & { status: Status }>[] = [
  { id: 'name', header: 'Nom', value: (row) => row.name, filter: 'text' },
  {
    id: 'email',
    header: 'Adresse e-mail',
    value: (row) => row.email,
    filter: 'text',
    class: 'text-gray-500',
  },
  {
    id: 'status',
    header: 'Statut',
    value: (row) => statusOrder.indexOf(row.status),
    format: (rank) => (typeof rank === 'number' ? statuses[statusOrder[rank]!].label : ''),
    cell: (row) => (
      <span class={['rounded-full px-2 py-0.5 text-xs', statuses[row.status].badge]}>
        {statuses[row.status].label}
      </span>
    ),
    filter: 'select',
  },
]

function StatsContent(props: { watch: () => AsyncIterable<Stats> }) {
  const stats = createMemo(() => props.watch(), { name: 'exerciseStats' })
  const students = createMemo(() =>
    stats().students.map((student) => ({ ...student, status: statusOf(student) })),
  )
  const counts = createMemo(() => {
    const counts = { correct: 0, incorrect: 0, started: 0, opened: 0 } satisfies Record<
      Status,
      number
    >
    for (const { status } of students()) counts[status]++
    return counts
  })
  const total = () => students().length
  const segments = createMemo(() =>
    (Object.keys(statuses) as Status[])
      .map((status) => ({ status, count: counts()[status] }))
      .filter(({ count }) => count > 0),
  )

  return (
    <Show
      when={total() > 0}
      fallback={<p class="text-gray-500">Aucun étudiant n'a encore ouvert cet exercice.</p>}
    >
      <p class="mb-2">
        <strong>{counts().correct}</strong> sur {total()} étudiant{total() > 1 ? 's' : ''} ont
        réussi, <strong>{counts().incorrect}</strong> ont échoué.
      </p>
      <div
        class="flex h-6 w-full overflow-hidden rounded-full bg-gray-100"
        role="img"
        aria-label={segments()
          .map(({ status, count }) => `${statuses[status].label}\u00a0: ${count}`)
          .join(', ')}
      >
        <For each={segments()} keyed={(segment) => segment.status}>
          {(segment) => (
            <div
              class={[
                'flex items-center justify-center text-xs font-bold text-white transition-[width]',
                statuses[segment().status].bar,
              ]}
              style={{ width: `${(100 * segment().count) / total()}%` }}
              title={`${statuses[segment().status].label}\u00a0: ${segment().count}`}
            >
              {segment().count}
            </div>
          )}
        </For>
      </div>
      <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <For each={Object.keys(statuses) as Status[]}>
          {(status) => (
            <li class="flex items-center gap-1">
              <span class={['inline-block size-3 rounded-full', statuses[status].bar]} />
              {statuses[status].label} ({counts()[status]})
            </li>
          )}
        </For>
      </ul>
      <details class="mt-4">
        <summary class="cursor-pointer text-sm text-gray-500">Afficher les détails</summary>
        <Table
          rows={students()}
          columns={studentColumns}
          key={(row) => row.email}
          exportName="resultats"
          class="mt-2"
        />
      </details>
    </Show>
  )
}
