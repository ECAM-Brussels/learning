import { Dynamic, type JSX } from '@solidjs/web'
import { createContext, useContext, type ParentComponent, type ParentProps } from 'solid-js'

type Components = Record<string, ParentComponent<{ className?: string }>>

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
