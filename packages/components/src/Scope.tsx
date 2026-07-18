import type { JSX } from '@solidjs/web'
import { Loading } from '@solidjs/web'

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
