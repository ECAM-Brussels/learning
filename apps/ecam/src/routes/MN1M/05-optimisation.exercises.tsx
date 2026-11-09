import { Board } from '@learning/components'
import { tex } from '@learning/core'
import { createProjection, createSignal, For, Repeat, Show } from 'solid-js'

export function NewtonRaphsonAnimation() {
  const fn = (x: number) => 0.1 * x ** 2 + 2 * Math.sin(0.5 * x + 4)
  const df = (x: number) => 0.2 * x + Math.cos(0.5 * x + 4)
  const ddf = (x: number) => 0.2 - 0.5 * Math.sin(0.5 * x + 4)
  const [x0, setX0] = createSignal(4)
  const [n, setN] = createSignal(4)
  const next = (x: number) => x - df(x) / ddf(x)
  const x = createProjection<[number, ...number[]]>(() => {
    const result = [x0()] as [number, ...number[]]
    let last = x0()
    for (let i = 1; i < n(); i++) {
      last = next(last)
      result.push(last)
    }
    return result
  }, [x0()])
  return (
    <Board>
      <Board.Axis from={[0, 0]} to={[0, 1]} ticks={{ visible: false }} name="y" withLabel />
      <Board.Axis from={[0, 0]} to={[1, 0]} name="x" ticks={{ visible: false }} withLabel />
      <Board.Plot fn={df} strokeColor="lightblue" withLabel name="f'" strokeWidth={2} />
      <Repeat count={x.length}>
        {(i) => (
          <>
            <Board.Point name={`x_{${i}}`} position={[x[i]!, 0]} fixed color="black" size={1} />
            <Show when={i < x.length - 1}>
              <Board.Arrow
                from={[x[i]!, 0]}
                to={[x[i]!, df(x[i]!)]}
                fixed
                strokeColor="green"
                strokeWidth={1.5}
              />
              <Board.Arrow
                from={[x[i]!, df(x[i]!)]}
                to={[next(x[i]!), 0]}
                fixed
                strokeColor="green"
                strokeWidth={1.5}
              />
            </Show>
          </>
        )}
      </Repeat>
      <Board.Plot fn={fn} strokeWidth={4} name="f" withLabel>
        {(curve) => (
          <Board.Glider
            on={curve}
            position={[x0(), fn(x0())]}
            name="P"
            onDrag={(P) => setX0(P.X())}
          />
        )}
      </Board.Plot>
      <Board.Segment
        from={[x[x.length - 1]!, 0]}
        to={[x[x.length - 1]!, fn(x[x.length - 1]!)]}
        fixed
        dash={1}
        color="lightgray"
      />
      <Board.Point
        position={[x[x.length - 1]!, fn(x[x.length - 1]!)]}
        name="\text{minimum estimé}"
        fixed
      />
    </Board>
  )
}

export function GradientDescentAnimation() {
  const fn = (x: number) => x ** 2 - 4
  const df = (x: number) => 2 * x
  const [x0, setX0] = createSignal(2.5)
  const [n, setN] = createSignal(3)
  const [eta, setEta] = createSignal(0.3)
  const x = createProjection<[number, ...number[]]>(() => {
    const result = [x0()] as [number, ...number[]]
    let last = x0()
    for (let i = 1; i < n(); i++) {
      last = last - df(last) * eta()
      result.push(last)
    }
    return result
  }, [x0()])
  return (
    <>
      <hgroup class="text-center">
        <h3 class="mb-0 text-xl font-bold">Descente de gradient</h3>
        <h5 class="text-gray-500">{tex`x_{n + 1} = x_n - \eta f'(x_n)`}</h5>
      </hgroup>
      <Board>
        <Board.Axis from={[0, 0]} to={[0, 1]} ticks={{ visible: false }} />
        <Board.Axis from={[0, 0]} to={[1, 0]} ticks={{ visible: false }} />
        <Board.Plot fn={fn}>
          {(curve) => (
            <Board.Glider
              on={curve}
              position={[x0(), fn(x0())]}
              name="P"
              onDrag={(P) => setX0(P.X())}
            />
          )}
        </Board.Plot>
        <For each={x}>
          {(t, i) => (
            <>
              <Board.Segment
                from={[t, 0]}
                to={[t, fn(t)]}
                fixed
                dash={1}
                color="gray"
                opacity={i() === x.length - 1 ? 1 : 0.3}
              />
              <Board.Point
                position={[t, 0]}
                name={`x_{${i()}}`}
                withLabel={i() === x.length - 1}
                fixed={i() === 0}
                onDrag={(P) => {
                  if (i() === 0) setX0(P.X())
                }}
                opacity={i() === x.length - 1 ? 1 : 0.3}
              />
              <Board.Plot
                fn={(s) => df(t) * (s - t) + fn(t)}
                domain={[t - 0.1, t + 0.1]}
                color={i() === x.length - 1 ? 'darkgreen' : 'black'}
                strokeWidth={3}
                opacity={i() === x.length - 1 ? 1 : 0.3}
              />
            </>
          )}
        </For>
      </Board>
      <div class="flex items-center justify-center gap-8">
        <label>
          Nombre d'itérations:
          <input
            class="ml-4 rounded-xl border border-gray-400 px-4"
            type="number"
            value={n()}
            onInput={(e) => setN(Number(e.target.value))}
            min={0}
            max={10}
          />
        </label>
        <label>
          {tex`\eta`}:
          <input
            class="mx-4 rounded-xl border border-gray-400 px-4"
            type="range"
            value={eta()}
            onInput={(e) => {
              try {
                setEta(Number(e.target.value))
              } catch {}
            }}
            min={0.1}
            max={0.9}
            step={0.05}
          />
          {tex`${eta()}`}
        </label>
      </div>
    </>
  )
}
