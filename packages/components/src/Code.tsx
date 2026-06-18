import dedent from 'dedent'
import { createMemo, lazy, Loading, type Component, type ComponentProps } from 'solid-js'

const _Code = lazy(() => import('./CodeImplementation'))

export const Code: Component<ComponentProps<typeof _Code>> = (props) => (
  <Loading fallback={<p>Chargement de l'éditeur...</p>}>
    <_Code {...props} />
  </Loading>
)

export function code(props: Omit<ComponentProps<typeof Code>, 'children'>) {
  return (strings: TemplateStringsArray, ...values: unknown[]) => {
    const code = createMemo(() =>
      dedent(strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')),
    )
    return <Code {...props} children={code()} />
  }
}
