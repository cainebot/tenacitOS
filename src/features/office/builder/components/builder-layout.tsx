'use client'

import dynamic from 'next/dynamic'
import { BuilderTopBar } from './builder-top-bar'
import { BuilderToolbar } from './builder-toolbar'

const BuilderBridge = dynamic(
  () => import('@/game/builder-bridge').then((m) => m.BuilderBridge),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-tertiary">Loading builder...</p>
      </div>
    ),
  },
)

export function BuilderLayout() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Top bar — full width header */}
      <BuilderTopBar />

      {/* Content row: toolbar | canvas | right panel */}
      <div className="flex flex-row flex-1 min-h-0">
        {/* Left toolbar */}
        <BuilderToolbar />

        {/* Center canvas — Phaser builder */}
        <div className="flex flex-1 min-w-0 h-full">
          <BuilderBridge />
        </div>

        {/* Right panel placeholder — replaced by BuilderRightPanel in Wave 2 */}
        <div className="w-[373px] shrink-0 bg-secondary border-l border-primary flex items-center justify-center">
          <p className="text-sm text-tertiary">Zone Panel (Wave 2)</p>
        </div>
      </div>
    </div>
  )
}
