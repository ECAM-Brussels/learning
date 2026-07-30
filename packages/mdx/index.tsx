import { Dynamic, type JSX } from '@solidjs/web'
import {
  createContext,
  useContext,
  type Component,
  type ParentComponent,
  type ParentProps,
} from 'solid-js'

type LowercaseKey = `${Lowercase<string>}${string}`
type Components = Partial<
  {
    div: ParentComponent<{ 'data-type'?: string }>
    Code: Component<{
      lang: 'python'
      children: string
      run?: boolean
      math?: boolean
    }>
    Highlight: Component<{
      lang?: string
      code: string
    }>
    Latex: Component<{
      value: string
      displayMode?: boolean
    }>
  } & {
    [K in LowercaseKey]?: ParentComponent
  }
>

export const MDXContext = createContext<Components>({
  h1: (props) => <h1 {...props} />,
  h2: (props) => <h2 {...props} />,
  h3: (props) => <h3 {...props} />,
  h4: (props) => <h4 {...props} />,
  h5: (props) => <h5 {...props} />,
  h6: (props) => <h6 {...props} />,
  hr: (props) => <hr {...props} />,
  div: (props) => <div {...props} />,
  p: (props) => <p {...props} />,
  a: (props) => <a {...props} />,
  ul: (props) => <ul {...props} />,
  ol: (props) => <ol {...props} />,
  li: (props) => <li {...props} />,
  blockquote: (props) => <blockquote {...props} />,
  code: (props) => <code {...props} />,
  pre: (props) => <pre {...props} />,
  img: (props) => <img {...props} />,
  table: (props) => <table {...props} />,
  th: (props) => <th {...props} />,
  td: (props) => <td {...props} />,
  strong: (props) => <strong {...props} />,
  em: (props) => <em {...props} />,
})

export const MDXProvider = (props: ParentProps<{ components: Components }>): JSX.Element => {
  const context = useContext(MDXContext)
  return <MDXContext value={{ ...context, ...props.components }}>{props.children}</MDXContext>
}

export const useMDXComponents = (components: Components) => {
  const contextComponents = useContext(MDXContext)
  return { ...contextComponents, ...components }
}

export const Fragment: ParentComponent = (props) => props.children

export const jsx = (type: string | ParentComponent, props: ParentProps): JSX.Element =>
  typeof type === 'function' && type.name === 'Fragment' ? (
    <>{props.children}</>
  ) : (
    <Dynamic component={type} {...props} />
  )

export const jsxs = jsx

export const jsxDEV = jsx
