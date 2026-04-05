'use client'

import dynamic from 'next/dynamic'
import { BuilderTopBar } from './builder-top-bar'
import { BuilderToolbar } from './builder-toolbar'
import { BuilderRightPanel } from './builder-right-panel'
import { BuilderPopover } from './builder-popover'

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

        {/* Center canvas — Phaser builder + popover overlay */}
        <div className="relative flex-1 min-w-0 min-h-0">
          <BuilderBridge />
          <BuilderPopover />
        </div>

        {/* Right panel — Zone management */}
        <BuilderRightPanel />
      </div>
    </div>
  )
}
