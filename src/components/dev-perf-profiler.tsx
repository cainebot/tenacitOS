"use client"

import { useState, useRef, useCallback, useEffect } from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FpsSample {
  /** HH:mm:ss.SSS */
  t: string
  fps: number
  frameDelta: number
}

interface EventRecord {
  t: string
  elapsed_ms: number
  type: string
  target: string
  detail?: Record<string, unknown>
}

interface MemorySnapshot {
  t: string
  elapsed_ms: number
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
}

interface LongTaskEntry {
  t: string
  elapsed_ms: number
  duration: number
  name: string
}

interface LayoutShiftEntry {
  t: string
  elapsed_ms: number
  value: number
}

interface DomMutationBatch {
  t: string
  elapsed_ms: number
  count: number
  types: string[]
}

interface ProfilerSession {
  meta: {
    startTime: string
    endTime: string
    startTimestamp: string
    endTimestamp: string
    duration_ms: number
    userAgent: string
    viewport: { width: number; height: number }
    devicePixelRatio: number
    hardwareConcurrency: number
  }
  fps: FpsSample[]
  events: EventRecord[]
  memory: MemorySnapshot[]
  longTasks: LongTaskEntry[]
  layoutShifts: LayoutShiftEntry[]
  domMutations: DomMutationBatch[]
  summary: {
    avgFps: number
    minFps: number
    maxFps: number
    p5Fps: number
    totalEvents: number
    totalLongTasks: number
    totalLayoutShifts: number
    totalDomMutations: number
    eventBreakdown: Record<string, number>
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ts(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  const ms = String(d.getMilliseconds()).padStart(3, "0")
  return `${hh}:${mm}:${ss}.${ms}`
}

function elapsedSince(start: number): number {
  return Math.round(performance.now() - start)
}

function describeTarget(el: EventTarget | null): string {
  if (!el || !(el instanceof HTMLElement)) return "unknown"
  const tag = el.tagName.toLowerCase()
  const cls = el.className
    ? `.${String(el.className).split(" ").slice(0, 3).join(".")}`
    : ""
  const id = el.id ? `#${el.id}` : ""
  const role = el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""
  const dataType = el.dataset.type ? `[data-type=${el.dataset.type}]` : ""
  return `${tag}${id}${cls}${role}${dataType}`.slice(0, 120)
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.floor((p / 100) * sorted.length)
  return sorted[Math.min(idx, sorted.length - 1)]
}

// ---------------------------------------------------------------------------
// Tracked event types
// ---------------------------------------------------------------------------

const POINTER_EVENTS = [
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
] as const

const DRAG_EVENTS = [
  "dragstart",
  "drag",
  "dragover",
  "dragend",
  "drop",
] as const

const MOUSE_EVENTS = [
  "mousedown",
  "mousemove",
  "mouseup",
  "click",
] as const

const TRACKED_EVENTS = [
  ...POINTER_EVENTS,
  ...DRAG_EVENTS,
  ...MOUSE_EVENTS,
  "scroll",
  "wheel",
  "touchstart",
  "touchmove",
  "touchend",
] as const

// Throttle high-frequency events (only record every N ms)
const THROTTLED: Record<string, number> = {
  pointermove: 16,
  mousemove: 16,
  drag: 16,
  dragover: 16,
  touchmove: 16,
  scroll: 50,
  wheel: 50,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DevPerfProfiler() {
  const [open, setOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [liveFps, setLiveFps] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [elapsed, setElapsed] = useState("00:00:00.000")

  // Mutable recording state refs
  const startTimeRef = useRef(0)
  const fpsRef = useRef<FpsSample[]>([])
  const eventsRef = useRef<EventRecord[]>([])
  const memoryRef = useRef<MemorySnapshot[]>([])
  const longTasksRef = useRef<LongTaskEntry[]>([])
  const layoutShiftsRef = useRef<LayoutShiftEntry[]>([])
  const domMutationsRef = useRef<DomMutationBatch[]>([])

  // Cleanup refs
  const rafRef = useRef<number>(0)
  const memIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const perfObserverRef = useRef<PerformanceObserver | null>(null)
  const layoutObserverRef = useRef<PerformanceObserver | null>(null)
  const mutObserverRef = useRef<MutationObserver | null>(null)
  const throttleMapRef = useRef<Record<string, number>>({})

  // Only render in dev mode
  if (process.env.NODE_ENV !== "development") return null

  // ---- FPS loop ----
  const startFpsLoop = useCallback(() => {
    let lastFrame = performance.now()
    let frameCount = 0
    let lastFpsCalc = performance.now()

    const loop = (now: number) => {
      const delta = now - lastFrame
      lastFrame = now
      frameCount++

      if (now - lastFpsCalc >= 500) {
        const fps = Math.round((frameCount * 1000) / (now - lastFpsCalc))
        setLiveFps(fps)
        fpsRef.current.push({
          t: ts(),
          fps,
          frameDelta: Math.round(delta * 100) / 100,
        })
        frameCount = 0
        lastFpsCalc = now
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  // ---- Event listeners ----
  const eventHandler = useCallback((e: Event) => {
    const now = performance.now()
    const type = e.type

    // Throttle high-frequency events
    const throttleMs = THROTTLED[type]
    if (throttleMs) {
      const last = throttleMapRef.current[type] ?? 0
      if (now - last < throttleMs) return
      throttleMapRef.current[type] = now
    }

    const detail: Record<string, unknown> = {}
    if (e instanceof PointerEvent || e instanceof MouseEvent) {
      detail.x = e.clientX
      detail.y = e.clientY
      detail.button = e.button
      if (e instanceof PointerEvent) {
        detail.pointerId = e.pointerId
        detail.pointerType = e.pointerType
        detail.pressure = e.pressure
      }
    }
    if (e instanceof WheelEvent) {
      detail.deltaX = e.deltaX
      detail.deltaY = e.deltaY
    }

    eventsRef.current.push({
      t: ts(),
      elapsed_ms: elapsedSince(startTimeRef.current),
      type,
      target: describeTarget(e.target),
      detail: Object.keys(detail).length > 0 ? detail : undefined,
    })
    setEventCount((c) => c + 1)
  }, [])

  // ---- Memory sampling ----
  const startMemorySampling = useCallback(() => {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
    if (!mem) return
    memIntervalRef.current = setInterval(() => {
      memoryRef.current.push({
        t: ts(),
        elapsed_ms: elapsedSince(startTimeRef.current),
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
      })
    }, 500)
  }, [])

  // ---- Performance observers ----
  const startObservers = useCallback(() => {
    try {
      perfObserverRef.current = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasksRef.current.push({
            t: ts(),
            elapsed_ms: elapsedSince(startTimeRef.current),
            duration: Math.round(entry.duration * 100) / 100,
            name: entry.name,
          })
        }
      })
      perfObserverRef.current.observe({ type: "longtask", buffered: false })
    } catch {
      // longtask not supported
    }

    try {
      layoutObserverRef.current = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          layoutShiftsRef.current.push({
            t: ts(),
            elapsed_ms: elapsedSince(startTimeRef.current),
            value: (entry as unknown as { value: number }).value,
          })
        }
      })
      layoutObserverRef.current.observe({ type: "layout-shift", buffered: false })
    } catch {
      // layout-shift not supported
    }
  }, [])

  // ---- DOM mutation observer ----
  const startMutationObserver = useCallback(() => {
    let batchCount = 0
    let batchTypes = new Set<string>()
    let flushTimer: ReturnType<typeof setTimeout> | null = null

    mutObserverRef.current = new MutationObserver((mutations) => {
      batchCount += mutations.length
      for (const m of mutations) batchTypes.add(m.type)

      if (!flushTimer) {
        flushTimer = setTimeout(() => {
          domMutationsRef.current.push({
            t: ts(),
            elapsed_ms: elapsedSince(startTimeRef.current),
            count: batchCount,
            types: [...batchTypes],
          })
          batchCount = 0
          batchTypes = new Set()
          flushTimer = null
        }, 100)
      }
    })
    mutObserverRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })
  }, [])

  // ---- Elapsed timer ----
  const startElapsedTimer = useCallback(() => {
    elapsedIntervalRef.current = setInterval(() => {
      const ms = performance.now() - startTimeRef.current
      const totalMs = Math.floor(ms)
      const h = String(Math.floor(totalMs / 3600000)).padStart(2, "0")
      const m = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, "0")
      const s = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, "0")
      const mil = String(totalMs % 1000).padStart(3, "0")
      setElapsed(`${h}:${m}:${s}.${mil}`)
    }, 47) // ~21fps update for the timer display
  }, [])

  // ---- Start recording ----
  const startRecording = useCallback(() => {
    // Reset
    fpsRef.current = []
    eventsRef.current = []
    memoryRef.current = []
    longTasksRef.current = []
    layoutShiftsRef.current = []
    domMutationsRef.current = []
    throttleMapRef.current = {}
    setEventCount(0)
    setElapsed("00:00:00.000")

    startTimeRef.current = performance.now()
    setRecording(true)

    startFpsLoop()
    startMemorySampling()
    startObservers()
    startMutationObserver()
    startElapsedTimer()

    // Attach event listeners
    for (const type of TRACKED_EVENTS) {
      document.addEventListener(type, eventHandler, { passive: true, capture: true })
    }
  }, [startFpsLoop, startMemorySampling, startObservers, startMutationObserver, startElapsedTimer, eventHandler])

  // ---- Stop recording & export ----
  const stopRecording = useCallback(() => {
    setRecording(false)

    // Cleanup
    cancelAnimationFrame(rafRef.current)
    if (memIntervalRef.current) clearInterval(memIntervalRef.current)
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current)
    perfObserverRef.current?.disconnect()
    layoutObserverRef.current?.disconnect()
    mutObserverRef.current?.disconnect()

    for (const type of TRACKED_EVENTS) {
      document.removeEventListener(type, eventHandler, { capture: true } as EventListenerOptions)
    }

    // Build summary
    const fpsValues = fpsRef.current.map((s) => s.fps)
    const avgFps = fpsValues.length > 0
      ? Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length)
      : 0
    const minFps = fpsValues.length > 0 ? Math.min(...fpsValues) : 0
    const maxFps = fpsValues.length > 0 ? Math.max(...fpsValues) : 0
    const p5Fps = percentile(fpsValues, 5)

    const eventBreakdown: Record<string, number> = {}
    for (const ev of eventsRef.current) {
      eventBreakdown[ev.type] = (eventBreakdown[ev.type] ?? 0) + 1
    }

    const endTime = performance.now()
    const duration_ms = Math.round(endTime - startTimeRef.current)

    const session: ProfilerSession = {
      meta: {
        startTime: ts(),
        endTime: ts(),
        startTimestamp: new Date(Date.now() - duration_ms).toISOString(),
        endTimestamp: new Date().toISOString(),
        duration_ms,
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio,
        hardwareConcurrency: navigator.hardwareConcurrency,
      },
      fps: fpsRef.current,
      events: eventsRef.current,
      memory: memoryRef.current,
      longTasks: longTasksRef.current,
      layoutShifts: layoutShiftsRef.current,
      domMutations: domMutationsRef.current,
      summary: {
        avgFps,
        minFps,
        maxFps,
        p5Fps,
        totalEvents: eventsRef.current.length,
        totalLongTasks: longTasksRef.current.length,
        totalLayoutShifts: layoutShiftsRef.current.length,
        totalDomMutations: domMutationsRef.current.reduce((a, b) => a + b.count, 0),
        eventBreakdown,
      },
    }

    // Download JSON
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    a.href = url
    a.download = `perf-profile-${dateStr}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [eventHandler])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (memIntervalRef.current) clearInterval(memIntervalRef.current)
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current)
      perfObserverRef.current?.disconnect()
      layoutObserverRef.current?.disconnect()
      mutObserverRef.current?.disconnect()
    }
  }, [])

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 82,
    right: 12,
    zIndex: 99999,
    padding: "10px 14px",
    fontSize: 11,
    fontFamily: "var(--font-jetbrains), monospace",
    background: "#18181b",
    color: "#e4e4e7",
    border: "1px solid #3f3f46",
    borderRadius: 8,
    minWidth: 220,
    lineHeight: 1.6,
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  }

  return (
    <>
      {/* Tiny trigger button — bottom-right, above DevCacheButton */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: 48,
          right: 12,
          zIndex: 99999,
          width: 28,
          height: 28,
          fontSize: 14,
          fontFamily: "var(--font-jetbrains), monospace",
          background: recording ? "#dc2626" : "#27272a",
          color: "#a1a1aa",
          border: "1px solid #3f3f46",
          borderRadius: 6,
          cursor: "pointer",
          opacity: recording ? 0.9 : 0.35,
          transition: "opacity 0.15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = recording ? "0.9" : "0.35")}
        title="Performance Profiler"
      >
        {recording ? "●" : "⚡"}
      </button>

      {/* Panel */}
      {open && (
        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "#fafafa" }}>
              Perf Profiler
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#71717a",
                cursor: "pointer",
                fontSize: 14,
                padding: "0 2px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Live FPS */}
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: "#71717a" }}>FPS: </span>
            <span style={{
              fontWeight: 700,
              color: liveFps >= 50 ? "#22c55e" : liveFps >= 30 ? "#eab308" : "#ef4444",
            }}>
              {recording ? liveFps : "—"}
            </span>
          </div>

          {/* Elapsed */}
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: "#71717a" }}>Time: </span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {elapsed}
            </span>
          </div>

          {/* Event count */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ color: "#71717a" }}>Events: </span>
            <span>{eventCount}</span>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 6 }}>
            {!recording ? (
              <button
                onClick={startRecording}
                style={{
                  flex: 1,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  background: "#16a34a",
                  color: "#fafafa",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ▶ Record
              </button>
            ) : (
              <button
                onClick={stopRecording}
                style={{
                  flex: 1,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontFamily: "inherit",
                  background: "#dc2626",
                  color: "#fafafa",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ■ Stop & Save
              </button>
            )}
          </div>

          <div style={{ marginTop: 8, fontSize: 10, color: "#52525b" }}>
            Records FPS, pointer/DnD events, memory, long tasks, DOM mutations.
            Saves JSON on stop.
          </div>
        </div>
      )}
    </>
  )
}
