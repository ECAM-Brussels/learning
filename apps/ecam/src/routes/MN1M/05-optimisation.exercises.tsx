import { Board } from '@learning/components'
import { createMemo, createSignal, merge, onSettled } from 'solid-js'

function useAnimationFrame(step: (dt: number) => void) {
  let raf = 0
  let last = 0

  onSettled(() => {
    const frame = (now: number) => {
      if (!last) {
        last = now
      }

      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      step(dt)
      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  })
}

type CurveKinematicsOptions = {
  initialX: number
  minX: number
  maxX: number
  spring: number
  damping: number
  dfn: (x: number) => number
  releaseDelayMs?: number
  settleEpsilon?: number
}

function useCurveKinematics(rawOptions: CurveKinematicsOptions) {
  const options = merge(
    {
      releaseDelayMs: 80,
      settleEpsilon: 0.001,
    },
    rawOptions,
  )

  const [x, setX] = createSignal(options.initialX)
  const [isDragging, setIsDragging] = createSignal(false)

  let velocity = 0
  let releaseTimer = 0
  let lastDragX = options.initialX
  let lastDragTime = 0

  const clampX = (value: number) => Math.max(options.minX, Math.min(options.maxX, value))
  const setClampedX = (nextX: number) => setX(clampX(nextX))

  useAnimationFrame((dt) => {
    if (isDragging()) {
      return
    }

    const slope = options.dfn(x())
    const accel = (-options.spring * slope) / Math.hypot(1, slope) - options.damping * velocity
    velocity += accel * dt

    const nextX = clampX(x() + velocity * dt)
    if (nextX === options.minX || nextX === options.maxX) {
      velocity *= -0.25
    }
    setX(nextX)

    if (Math.abs(nextX) < options.settleEpsilon && Math.abs(velocity) < options.settleEpsilon) {
      setX(0)
      velocity = 0
    }
  })

  onSettled(() => {
    return () => {
      if (releaseTimer) {
        clearTimeout(releaseTimer)
        releaseTimer = 0
      }
    }
  })

  const onDragX = (draggedX: number) => {
    const now = performance.now()
    const clampedX = clampX(draggedX)
    const dt = (now - lastDragTime) / 1000

    if (dt > 0.001) {
      velocity = (clampedX - lastDragX) / dt
    }

    lastDragX = clampedX
    lastDragTime = now
    setIsDragging(true)
    setClampedX(clampedX)

    if (releaseTimer) {
      clearTimeout(releaseTimer)
    }
    releaseTimer = window.setTimeout(() => {
      setIsDragging(false)
    }, options.releaseDelayMs)
  }

  return {
    x,
    onDragX,
  }
}

type RollingBallOnGraphProps = {
  fn: (x: number) => number
  dfn: (x: number) => number
  initialX?: number
  radius?: number
  minX?: number
  maxX?: number
  spring?: number
  damping?: number
  boundingbox?: [number, number, number, number]
  class?: string
}

export function RollingBallOnGraph(rawProps: RollingBallOnGraphProps) {
  const props = merge(
    {
      initialX: -3.2,
      radius: 0.35,
      minX: -4,
      maxX: 4,
      spring: 18,
      damping: 1.1,
      boundingbox: [-5, 3, 5, -3] as [number, number, number, number],
      class: '',
    },
    rawProps,
  )

  const kinematics = useCurveKinematics({
    initialX: props.initialX,
    minX: props.minX,
    maxX: props.maxX,
    spring: props.spring,
    damping: props.damping,
    dfn: props.dfn,
  })

  const center = createMemo<[number, number]>(() => {
    const xx = kinematics.x()
    const y = props.fn(xx)
    const slope = props.dfn(xx)
    const normalLength = Math.hypot(slope, 1)
    const cx = xx - (props.radius * slope) / normalLength
    const cy = y + props.radius / normalLength
    return [cx, cy]
  })

  const contact = createMemo<[number, number]>(() => [kinematics.x(), props.fn(kinematics.x())])

  return (
    <div class={['space-y-3', props.class]}>
      <div class="text-sm text-slate-600">
        Drag the ball along the curve and release. It rolls toward the minimum with damping.
      </div>

      <Board
        boundingbox={props.boundingbox}
        axis={true}
        showNavigation={false}
        showZoom={false}
        keepAspectRatio={true}
      >
        <Board.Plot fn={props.fn} strokeWidth={2}>
          {(plot) => (
            <Board.Glider
              position={contact()}
              on={plot}
              name=""
              size={2}
              color="#0f172a"
              fillColor="#0f172a"
              onDrag={(glider) => {
                kinematics.onDragX(glider.X())
              }}
            />
          )}
        </Board.Plot>
        <Board.Circle
          center={center()}
          radius={props.radius}
          strokeWidth={2}
          strokeColor="#0f172a"
          fillColor="#cbd5e1"
          fillOpacity={0.2}
          fixed={true}
        />
      </Board>
    </div>
  )
}

export function Animation() {
  return (
    <RollingBallOnGraph
      fn={(x) => 0.2 * x ** 2 - 1.5}
      dfn={(x) => 0.4 * x}
      initialX={-3.2}
      radius={0.35}
      minX={-4}
      maxX={4}
      spring={24}
      damping={1.1}
      boundingbox={[-5, 3, 5, -3]}
    />
  )
}
