import type { JSX } from '@solidjs/web'
import { createSignal, Show } from 'solid-js'
import { Boundary } from './Boundary'

/**
 * A button opening a modal dialog.
 *
 * The content is mounted only while the dialog is open, so it fetches fresh data on each opening
 * and whatever it holds (a live connection, a timer) is released when it closes.
 * It closes with its button, with Escape or by clicking outside it.
 */
export function Modal(props: {
  trigger: JSX.Element
  title: JSX.Element
  children: JSX.Element
  /** Shown while the content is loading. */
  fallback?: JSX.Element
  /** Classes of the button, replacing its default look. */
  triggerClass?: string
  /** Width class of the dialog, replacing `max-w-2xl`. */
  width?: string
}) {
  const [open, setOpen] = createSignal(false, { name: 'modal-open' })
  let dialog!: HTMLDialogElement
  return (
    <>
      <button
        type="button"
        class={
          props.triggerClass ??
          'cursor-pointer rounded-xl px-4 py-2 text-sm text-gray-500 hover:bg-gray-50'
        }
        onClick={() => {
          setOpen(true)
          dialog.showModal()
        }}
      >
        {props.trigger}
      </button>
      <dialog
        ref={dialog}
        class={[
          'm-auto w-full rounded-xl p-6 shadow-xl backdrop:bg-black/40',
          props.width ?? 'max-w-2xl',
        ]}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog) dialog.close()
        }}
      >
        <div class="mb-4 flex items-center justify-between gap-4">
          <h2 class="text-lg font-bold">{props.title}</h2>
          <button
            type="button"
            class="cursor-pointer rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-gray-100"
            onClick={() => dialog.close()}
          >
            Fermer
          </button>
        </div>
        <Show when={open()}>
          <Boundary fallback={props.fallback ?? 'Chargement...'}>{props.children}</Boundary>
        </Show>
      </dialog>
    </>
  )
}
