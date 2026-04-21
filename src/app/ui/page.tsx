'use client'

/**
 * /ui — Lab Index
 *
 * Hub de navegación para los laboratorios de componentes de agentes.
 * Equivalente a la sección /tests/ux/* en Paperclip.
 */

import Link from 'next/link'
import { LayoutGrid01, TerminalSquare, MessageDotsSquare } from '@untitledui/icons'
import { cx, FlaskConical } from '@circos/ui'

const labs = [
  {
    href: '/ui/transcript',
    eyebrow: 'Catálogo',
    title: 'Agent Activity Components',
    description: 'Inventario completo de componentes de actividad de agentes con previews en vivo de RunTranscriptView y ActivityRow.',
    icon: LayoutGrid01,
    status: 'ready' as const,
    badges: ['RunTranscriptView ✓', 'ActivityRow ✓', 'IssueChatThread ⏳'],
    accent: 'from-brand/10',
  },
  {
    href: '/ui/chat',
    eyebrow: 'Chat UX Lab',
    title: 'Issue Chat Review Surface',
    description: 'Laboratorio de UX para la superficie de chat conversacional. Demos de reasoning ticker, tokens Working/Worked y previews de IssueChatThread.',
    icon: MessageDotsSquare,
    status: 'partial' as const,
    badges: ['RotatingReasoningDemo ✓', 'Working/Worked tokens ✓', 'IssueChatThread ⏳'],
    accent: 'from-purple-500/10',
  },
  {
    href: '/ui/runs',
    eyebrow: 'Run Transcript Lab',
    title: 'Run Transcript Fixtures',
    description: 'Lab interactivo para RunTranscriptView. Cambia entre superficies Run Detail, Issue Widget y Dashboard Card con controles de modo y densidad.',
    icon: TerminalSquare,
    status: 'ready' as const,
    badges: ['RunTranscriptView ✓', 'Nice/Raw modes ✓', 'Streaming state ✓'],
    accent: 'from-cyan-500/10',
  },
]

function StatusPill({ status }: { status: 'ready' | 'partial' }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success-secondary bg-success-secondary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-success-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-success-solid" />
        Funcional
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-secondary bg-warning-secondary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-warning-solid" />
      Parcial
    </span>
  )
}

export default function UiLabIndexPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-[32px] border border-secondary bg-[linear-gradient(135deg,rgba(68,76,231,0.10),transparent_28%),linear-gradient(180deg,rgba(68,76,231,0.06),transparent_50%)] shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
        <div className="p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-secondary">
            <FlaskConical className="h-3.5 w-3.5" />
            Component Labs
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-primary">
            Agent activity UI labs
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-tertiary">
            Laboratorios temporales de componentes de agentes. Cada lab ejerce una superficie distinta con fixtures
            sin necesitar datos reales del backend. Storybook vive en{' '}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary">packages/ui/.storybook/</code>{' '}
            (port 6006).
          </p>
        </div>
      </div>

      {/* Lab cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {labs.map((lab) => {
          const Icon = lab.icon
          return (
            <Link
              key={lab.href}
              href={lab.href}
              className={cx(
                'group flex flex-col gap-4 overflow-hidden rounded-[24px] border border-secondary bg-primary/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all hover:border-brand/30 hover:shadow-[0_16px_40px_rgba(68,76,231,0.12)]',
                `bg-[linear-gradient(160deg,var(--tw-gradient-stops)),var(--bg-primary)] ${lab.accent} to-transparent`,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-secondary bg-secondary">
                  <Icon className="h-5 w-5 fg-brand-primary" />
                </div>
                <StatusPill status={lab.status} />
              </div>

              <div className="flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-tertiary">
                  {lab.eyebrow}
                </div>
                <h2 className="mt-1 text-base font-semibold text-primary group-hover:text-brand-primary transition-colors">
                  {lab.title}
                </h2>
                <p className="mt-2 text-sm text-tertiary leading-5">
                  {lab.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {lab.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-secondary bg-secondary px-2.5 py-0.5 text-[10px] text-tertiary"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <div className="text-xs font-medium text-brand-secondary opacity-0 transition-opacity group-hover:opacity-100">
                Abrir lab →
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
