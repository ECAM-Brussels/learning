import { Dynamic, type JSX } from '@solidjs/web'
import {
  createContext,
  useContext,
  type Component,
  type ParentComponent,
  type ParentProps,
} from 'solid-js'

type Components = Partial<{
  h1: ParentComponent
  h2: ParentComponent
  h3: ParentComponent
  h4: ParentComponent
  h5: ParentComponent
  h6: ParentComponent
  code: Component<{ children?: string }>
  pre: ParentComponent
  Code: Component<{ lang: 'python'; children: string; run?: boolean; math?: boolean }>
  div: ParentComponent<{ 'data-type'?: string }>
  Latex: Component<{ value: string; displayMode?: boolean }>
}>

export const MDXContext = createContext<Components>({})

export const MDXProvider = (props: ParentProps<{ components: Components }>): JSX.Element => {
  const context = useContext(MDXContext)
  return <MDXContext value={{ ...context, ...props.components }}>{props.children}</MDXContext>
}

export const useMDXComponents = (components: Components) => {
  const contextComponents = useContext(MDXContext)
  return { ...contextComponents, ...components }
}

export const Fragment: ParentComponent = (props) => <>{props.children}</>

export const jsx = (type: string | ParentComponent, props: ParentProps): JSX.Element =>
  typeof type === 'function' && type.name === 'Fragment' ? (
    <>{props.children}</>
  ) : (
    <Dynamic component={type} {...props} />
  )

export const jsxs = jsx

export const jsxDEV = jsx
