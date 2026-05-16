import { Loading } from '@solidjs/web'
import type { JSX } from 'solid-js/jsx-runtime'

/**
 * Provide a way to set up signals closer to their respective accessors in JSX.
 *
 * @example
 * <Scope>
 *   {() => {
 *     const [count, setCount] = createSignal(0)
 *     return (
 *       <div>
 *         <p>Count: {count()}</p>
 *         <button onClick={() => setCount(count() + 1)}>Increment</button>
 *       </div>
 *     )
 *   }}
 * </Scope>
 */
export function Scope(props: { children: () => JSX.Element }) {
  return <Loading>{props.children()}</Loading>
}

export default Scope
