import type { JSX } from '@solidjs/web'
import { Show, type ComponentProps } from 'solid-js'
import { useLang, type Lang } from './Meta'

const config = {
  definition: { label: { fr: 'Définition', en: 'Definition' }, class: 'bg-sky-100 text-sky-900' },
  example: { label: { fr: 'Exemple', en: 'Example' }, class: 'bg-sky-100 text-sky-900' },
  remark: { label: { fr: 'Remarque', en: 'Remark' }, class: 'bg-amber-100 text-amber-900' },
  exercise: { label: { fr: 'Exercice', en: 'Exercise' }, class: 'bg-green-100 text-green-900' },
  question: { label: { fr: 'Question', en: 'Question' }, class: 'bg-blue-100 text-blue-900' },
  info: { label: { fr: 'Info', en: 'Info' }, class: 'bg-gray-100 text-gray-900' },
} as const satisfies Record<string, { label: Record<Lang, string>; class: string }>

/**
 * A box headed by its kind, such as « Exemple » or « Définition », and its title if given.
 * In MDX, the directives write them: `:::example[Un titre]`, then the content, then `:::`.
 */
export function Environment(props: {
  children?: JSX.Element
  title?: JSX.Element
  type: keyof typeof config
}) {
  const lang = useLang()
  return (
    <div class="mx-8 my-4 rounded-lg border border-gray-200 shadow-sm print:break-inside-avoid">
      <h3 class={['not-prose rounded-t-lg px-4 py-1 font-semibold', config[props.type].class]}>
        {config[props.type].label[lang()]}
        <Show when={props.title}>
          <span class="font-light"> ({props.title})</span>
        </Show>
      </h3>
      <div class="my-4 px-4 py-2">{props.children}</div>
    </div>
  )
}

function makeEnvironment(type: keyof typeof config) {
  return (props: Omit<ComponentProps<typeof Environment>, 'type'>) => (
    <Environment type={type} {...props} />
  )
}

/**
 * A definition, in a box. In MDX: `:::definition[Fonction continue]`, the definition, then `:::`.
 *
 * @example
 * <Definition title="Fonction continue">Une fonction est continue si…</Definition>
 */
export const Definition = makeEnvironment('definition')
/** An example, in a box. In MDX: `:::example[Un titre]`, the example, then `:::`. */
export const Example = makeEnvironment('example')
/** An exercise, in a box. In MDX: `:::exercise[Un titre]`, the exercise, then `:::`. */
export const Exercise = makeEnvironment('exercise')
/** A remark, in a box. In MDX: `:::remark`, the remark, then `:::`. */
export const Remark = makeEnvironment('remark')
/** A question to the reader, in a box. In MDX: `:::question`, the question, then `:::`. */
export const Question = makeEnvironment('question')
/** Information, such as a tip, in a box. In MDX: `:::info[Un titre]`, the text, then `:::`. */
export const Info = makeEnvironment('info')
