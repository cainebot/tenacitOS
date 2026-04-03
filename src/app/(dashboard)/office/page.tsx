'use client'

import dynamic from 'next/dynamic'

const OfficeMap = dynamic(
  () => import('@/components/application/office-map').then(m => m.OfficeMap),
  { ssr: false, loading: () => (
    <div className="flex flex-1 w-full items-center justify-center">
      <p className="text-sm text-tertiary">Loading office...</p>
    </div>
  )}
)

export default function OfficePage() {
  return (
    <div className="flex flex-1 w-full overflow-hidden" style={{ minHeight: 0 }}>
      <OfficeMap />
    </div>
  )
}
