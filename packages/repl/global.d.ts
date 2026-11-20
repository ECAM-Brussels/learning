// Python sources are imported as strings through Vite's `?raw` suffix.
declare module '*.py?raw' {
  const source: string
  export default source
}
