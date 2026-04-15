'use client'

/**
 * /ui/chat — Issue Chat UX Lab
 *
 * Laboratorio de UX para la superficie de chat conversacional de CircOS.
 * Inspirado en Paperclip's IssueChatUxLab.tsx.
 *
 * Cubre:
 *   - RotatingReasoningDemo: ticker de razonamiento animado (auto-contenido)
 *   - Working / Worked header verb tokens
 *   - Previews de IssueChatThread (placeholders hasta que se porte el componente)
 *
 * IssueChatThread requiere @assistant-ui/react + useCircOSTaskRuntime.
 * Ver: components/application/PENDING_PORTS.md
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '@circos/ui'
import { MessageSquare01, Route, MagicWand01, CheckCircle, Zap } from '@untitledui/icons'
import { FlaskConical, Loader2, Brain } from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// RotatingReasoningDemo — auto-contenido, no depende de IssueChatThread
// ---------------------------------------------------------------------------

const DEMO_REASONING_LINES = [
  'Analizando la solicitud del usuario sobre el lead de Everis...',
  'La implementación actual no está adjuntando el contexto del CRM correctamente...',
  'Revisando el schema de cards en Supabase para el campo custom_fields...',
  'Necesito un JOIN entre cards y card_custom_values para recuperar todos los datos...',
  'Implementando la query con aggregate + jsonb_object_agg...',
  'Probando la transición de 280ms con cubic-bezier timing...',
]

function RotatingReasoningDemo({ intervalMs = 2200 }: { intervalMs?: number }) {
  const [index, setIndex] = useState(0)
  const prevRef = useRef(DEMO_REASONING_LINES[0])
  const [ticker, setTicker] = useState<{
    key: number
    current: string
    exiting: string | null
  }>({ key: 0, current: DEMO_REASONING_LINES[0], exiting: null })

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % DEMO_REASONING_LINES.length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  const currentLine = DEMO_REASONING_LINES[index]

  useEffect(() => {
    if (currentLine !== prevRef.current) {
      const prev = prevRef.current
      prevRef.current = currentLine
      setTicker((t) => ({ key: t.key + 1, current: currentLine, exiting: prev }))
    }
  }, [currentLine])

  return (
    <div className="flex gap-2 px-1">
      <div className="flex flex-col items-center pt-0.5">
        <Brain className="h-3.5 w-3.5 shrink-0 text-quaternary" />
      </div>
      <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
        {ticker.exiting !== null && (
          <span
            key={`out-${ticker.key}`}
            className="cot-line-exit absolute inset-x-0 truncate text-[13px] italic leading-5 text-quaternary"
            onAnimationEnd={() => setTicker((t) => ({ ...t, exiting: null }))}
          >
            {ticker.exiting}
          </span>
        )}
        <span
          key={`in-${ticker.key}`}
          className={cx(
            'absolute inset-x-0 truncate text-[13px] italic leading-5 text-quaternary',
            ticker.key > 0 && 'cot-line-enter',
          )}
        >
          {ticker.current}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LabSection — wrapper de sección con eyebrow, título, descripción
// ---------------------------------------------------------------------------

function LabSection({
  id,
  eyebrow,
  title,
  description,
  accentClassName,
  children,
}: {
  id?: string
  eyebrow: string
  title: string
  description: string
  accentClassName?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={cx(
        'rounded-[28px] border border-secondary bg-primary/80 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-5',
        accentClassName,
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-tertiary">
            {eyebrow}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-primary">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-tertiary">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// ChatThreadPlaceholder — sección pendiente de IssueChatThread
// ---------------------------------------------------------------------------

function ChatThreadPlaceholder({
  label,
  description,
}: {
  label: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-secondary bg-primary/60 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-secondary bg-secondary">
        <MessageSquare01 className="h-5 w-5 text-tertiary" />
      </div>
      <div>
        <p className="font-semibold text-primary text-sm">{label}</p>
        <p className="mt-1 max-w-sm text-sm text-tertiary">{description}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-[11px] text-tertiary">
        <span className="rounded-full border border-secondary bg-secondary px-3 py-1">
          requiere @assistant-ui/react
        </span>
        <span className="rounded-full border border-secondary bg-secondary px-3 py-1">
          requiere useCircOSTaskRuntime
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Highlights para el aside
// ---------------------------------------------------------------------------

const highlights = [
  'Replies de asistente en streaming: texto, razonamiento, tool cards y notas de estado de background',
  'Eventos históricos de issue y runs enlazados renderizados inline con el timeline del chat',
  'Mensajes de usuario en cola, comentarios de asistente asentados y controles de feedback',
  'Burbuja de mensaje enviando (pending) con etiqueta "Enviando..." y opacidad reducida',
  'Estados vacíos y compositor deshabilitado sin necesitar datos reales del backend',
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IssueChatLabPage() {
  const [showComposer, setShowComposer] = useState(true)

  return (
    <div className="space-y-6 p-6">
      {/* Hero header */}
      <div className="overflow-hidden rounded-[32px] border border-secondary bg-[linear-gradient(135deg,rgba(68,76,231,0.10),transparent_28%),linear-gradient(180deg,rgba(68,76,231,0.08),transparent_44%)] shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="p-6 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-secondary">
              <FlaskConical className="h-3.5 w-3.5" />
              Chat UX Lab
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-primary">
              Issue chat review surface
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-tertiary">
              Esta página ejercita el chat conversacional de CircOS con mensajes respaldados por fixtures.
              Úsala para revisar espaciado, cronología, estados en ejecución, renderizado de herramientas,
              filas de actividad, colas y comportamiento del compositor sin necesitar un task activo.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-secondary bg-secondary px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                /ui/chat
              </span>
              <span className="inline-flex items-center rounded-full border border-secondary bg-secondary px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                @assistant-ui/react thread
              </span>
              <span className="inline-flex items-center rounded-full border border-secondary bg-secondary px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                fixture-backed live run
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowComposer((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full border border-secondary bg-primary/80 px-3 py-1.5 text-xs text-tertiary transition-colors hover:text-secondary"
              >
                {showComposer ? 'Ocultar compositor en preview primario' : 'Mostrar compositor en preview primario'}
              </button>
              <a
                href="#live-execution"
                className="inline-flex items-center gap-2 rounded-full border border-secondary bg-primary/80 px-3 py-1.5 text-xs text-tertiary transition-colors hover:text-secondary"
              >
                <Route className="h-3.5 w-3.5" />
                Ir a preview de ejecución en vivo
              </a>
              <Link
                href="/ui/transcript"
                className="inline-flex items-center gap-2 rounded-full border border-secondary bg-primary/80 px-3 py-1.5 text-xs text-tertiary transition-colors hover:text-secondary"
              >
                Ver catálogo de componentes
              </Link>
            </div>
          </div>

          <aside className="border-t border-secondary bg-primary/70 p-6 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-tertiary">
              <MagicWand01 className="h-4 w-4 fg-brand-primary" />
              Estados cubiertos
            </div>
            <div className="space-y-3">
              {highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-xl border border-secondary bg-primary/85 px-4 py-3 text-sm text-tertiary"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* Rotating reasoning text */}
      <LabSection
        id="rotating-text"
        eyebrow="Demo de animación"
        title="Rotating reasoning text"
        description="Ticker aislado que cicla líneas de razonamiento de muestra en un timer. La línea saliente se desliza hacia arriba y se desvanece mientras la entrante sube desde abajo. Corre en loop para afinar timing y easing sin necesitar un stream en vivo."
        accentClassName="bg-[linear-gradient(180deg,rgba(168,85,247,0.06),transparent_28%)]"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-secondary bg-secondary/30 p-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-tertiary">
              Intervalo por defecto (2.2s)
            </div>
            <RotatingReasoningDemo />
          </div>
          <div className="rounded-xl border border-secondary bg-secondary/30 p-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-tertiary">
              Intervalo rápido (1s) — stress test
            </div>
            <RotatingReasoningDemo intervalMs={1000} />
          </div>
        </div>
      </LabSection>

      {/* Working / Worked tokens */}
      <LabSection
        id="working-tokens"
        eyebrow="Status tokens"
        title="Working / Worked header verb"
        description='El token "Working" usa el barrido de gradiente shimmer-text para señalar un run activo. Una vez completado el run, se convierte en el token estático "Worked".'
        accentClassName="bg-[linear-gradient(180deg,rgba(16,185,129,0.06),transparent_28%)]"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-secondary bg-secondary/30 p-4">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-tertiary">
              Run activo — shimmer
            </div>
            <div className="flex items-center gap-2.5 rounded-lg px-1 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-secondary">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-quaternary" />
                <span className="shimmer-text">Working</span>
              </span>
              <span className="text-xs text-quaternary">por 12s</span>
            </div>
          </div>
          <div className="rounded-xl border border-secondary bg-secondary/30 p-4">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-tertiary">
              Run completado — estático
            </div>
            <div className="flex items-center gap-2.5 rounded-lg px-1 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-secondary">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-solid/70" />
                </span>
                Worked
              </span>
              <span className="text-xs text-quaternary">por 1 min 24s</span>
            </div>
          </div>
        </div>
      </LabSection>

      {/* Live execution — placeholder hasta que IssueChatThread esté portado */}
      <LabSection
        id="live-execution"
        eyebrow="Preview primario"
        title="Live execution thread"
        description="Muestra el estado completamente activo: eventos de timeline, marcador de run histórico, una reply de asistente en ejecución con razonamiento y herramientas, y un follow-up del usuario en cola."
        accentClassName="bg-[linear-gradient(180deg,rgba(68,76,231,0.05),transparent_28%)]"
      >
        <ChatThreadPlaceholder
          label="IssueChatThread — live execution"
          description="Requiere @assistant-ui/react instalado y useCircOSTaskRuntime conectado a Supabase Realtime. Ver PENDING_PORTS.md para el checklist completo."
        />
      </LabSection>

      {/* Submitting state */}
      <LabSection
        eyebrow="Estado enviando"
        title="Pending message bubble"
        description='Cuando el usuario envía un mensaje, la burbuja muestra brevemente un label "Enviando..." con opacidad reducida hasta que el servidor confirma la recepción. Este preview renderiza ese estado transitorio.'
        accentClassName="bg-[linear-gradient(180deg,rgba(59,130,246,0.06),transparent_28%)]"
      >
        <ChatThreadPlaceholder
          label="IssueChatThread — submitting state"
          description="Preview del estado de burbuja pending. Disponible una vez portado IssueChatThread con los fixtures issueChatUxSubmittingComments."
        />
      </LabSection>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Settled review */}
        <LabSection
          eyebrow="Review asentado"
          title="Durable comments and feedback"
          description="Muestra el estado post-run: controles de feedback de comentarios de asistente, contexto de run histórico y reasignación de timeline sin ningún stream activo."
          accentClassName="bg-[linear-gradient(180deg,rgba(168,85,247,0.05),transparent_26%)]"
        >
          <ChatThreadPlaceholder
            label="IssueChatThread — settled review"
            description="Preview con feedbackVotes y estado in_review. Disponible una vez portado IssueChatThread."
          />
        </LabSection>

        <div className="space-y-6">
          {/* Empty thread */}
          <LabSection
            eyebrow="Thread vacío"
            title="Empty state y compositor deshabilitado"
            description="Mantiene el área de mensajes visible incluso cuando no hay thread, y reemplaza el compositor con un aviso explícito cuando las replies están bloqueadas."
            accentClassName="bg-[linear-gradient(180deg,rgba(245,158,11,0.08),transparent_26%)]"
          >
            <ChatThreadPlaceholder
              label="IssueChatThread — empty state"
              description="Preview de thread vacío con composerDisabledReason. Disponible una vez portado IssueChatThread."
            />
          </LabSection>

          {/* Review checklist */}
          <div className="overflow-hidden rounded-[28px] border border-secondary bg-primary/80 p-5">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-tertiary">
              <MessageSquare01 className="h-4 w-4 fg-brand-primary" />
              Review checklist
            </div>
            <h3 className="text-lg font-semibold text-primary">Qué evaluar en esta página</h3>
            <p className="mt-1 text-sm text-tertiary">
              Esta ruta debería ser la forma más rápida de inspeccionar el sistema de chat antes o después de cambios.
            </p>

            <div className="mt-4 space-y-3 text-sm text-tertiary">
              <div className="rounded-xl border border-secondary bg-primary/80 px-4 py-3">
                <div className="mb-1 flex items-center gap-2 font-medium text-primary">
                  <CheckCircle className="h-4 w-4 fg-brand-primary" />
                  Jerarquía de mensajes
                </div>
                Verificar que las filas de usuario, asistente y sistema se distingan sin parecer productos separados.
              </div>
              <div className="rounded-xl border border-secondary bg-primary/80 px-4 py-3">
                <div className="mb-1 flex items-center gap-2 font-medium text-primary">
                  <Zap className="h-4 w-4 fg-brand-primary" />
                  Pulido del stream
                </div>
                Observar el preview en vivo para densidad de razonamiento, comportamiento de expansión de herramientas y legibilidad del follow-up en cola.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
