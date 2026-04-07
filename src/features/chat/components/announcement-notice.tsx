'use client'

import { Lock01 } from '@untitledui/icons'

// ── Component ────────────────────────────────────────────────────────────────

export function AnnouncementNotice() {
  return (
    <div className="bg-secondary border-t border-secondary px-6 py-3 flex items-center gap-2 text-sm text-tertiary">
      <Lock01 className="size-4 text-fg-quaternary shrink-0" />
      <span>Announcement — agents cannot reply</span>
    </div>
  )
}
