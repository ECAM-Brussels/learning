import { Boundary } from '@learning/components'
import { createMemo, createSignal, For, Show } from 'solid-js'
import type { ExerciseStats as Stats } from './context'

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
  const [open, setOpen] = createSignal(false)
  let dialog!: HTMLDialogElement
  return (
    <>
      <button
        class="cursor-pointer rounded-xl px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
        onClick={() => {
          setOpen(true)
          dialog.showModal()
        }}
      >
        Montrer les statistiques de cet exercice
      </button>
      <dialog
        ref={dialog}
        class="m-auto w-full max-w-2xl rounded-xl p-6 shadow-xl backdrop:bg-black/40"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog) dialog.close()
        }}
      >
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-bold">Statistiques de l'exercice</h2>
          <button
            class="cursor-pointer rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
            onClick={() => dialog.close()}
          >
            Fermer
          </button>
        </div>
        {/* Mounted only while open, so that the live connection closes with the dialog */}
        <Show when={open()}>
          <Boundary fallback="Chargement des statistiques...">
            <StatsContent watch={props.watch} />
          </Boundary>
        </Show>
      </dialog>
    </>
  )
}

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
        <table class="mt-2 w-full text-left text-sm">
          <thead class="text-gray-500">
            <tr>
              <th class="py-1">Nom</th>
              <th class="py-1">Adresse e-mail</th>
              <th class="py-1">Statut</th>
            </tr>
          </thead>
          <tbody>
            <For each={students()} keyed={(student) => student.email}>
              {(student) => (
                <tr class="border-t border-gray-100">
                  <td class="py-1">{student().name}</td>
                  <td class="py-1 text-gray-500">{student().email}</td>
                  <td class="py-1">
                    <span
                      class={['rounded-full px-2 py-0.5 text-xs', statuses[student().status].badge]}
                    >
                      {statuses[student().status].label}
                    </span>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </details>
    </Show>
  )
}
