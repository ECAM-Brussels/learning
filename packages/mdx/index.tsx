import { createContext, useContext, type Component, type ParentComponent } from 'solid-js'

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
  a: (props) => <a {...props} />,
  blockquote: (props) => <blockquote {...props} />,
  code: (props) => <code {...props} />,
  div: (props) => <div {...props} />,
  em: (props) => <em {...props} />,
  h1: (props) => <h1 {...props} />,
  h2: (props) => <h2 {...props} />,
  h3: (props) => <h3 {...props} />,
  h4: (props) => <h4 {...props} />,
  h5: (props) => <h5 {...props} />,
  h6: (props) => <h6 {...props} />,
  hr: (props) => <hr {...props} />,
  img: (props) => <img {...props} />,
  label: (props) => <label {...props} />,
  li: (props) => <li {...props} />,
  ol: (props) => <ol {...props} />,
  p: (props) => <p {...props} />,
  pre: (props) => <pre {...props} />,
  strong: (props) => <strong {...props} />,
  table: (props) => <table {...props} />,
  tbody: (props) => <tbody {...props} />,
  td: (props) => <td {...props} />,
  tfoot: (props) => <tfoot {...props} />,
  th: (props) => <th {...props} />,
  thead: (props) => <thead {...props} />,
  tr: (props) => <tr {...props} />,
  ul: (props) => <ul {...props} />,
})

export const MDXProvider: ParentComponent<{ components: Components }> = (props) => {
  const context = useContext(MDXContext)
  return <MDXContext value={{ ...context, ...props.components }}>{props.children}</MDXContext>
}

export const useMDXComponents = (components: Components) => {
  const context = useContext(MDXContext)
  return { ...context, ...components }
}
