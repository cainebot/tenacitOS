'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, FeaturedIcon, Tabs, TabList, Tab, TabPanel } from '@circos/ui'
import { AlertCircle, SearchMd } from '@untitledui/icons'
import { useAgent } from '@/hooks/use-agent'
import { AgentDetailSummaryBar } from '@/components/application/agent-detail-summary-bar'

interface PageProps {
  params: Promise<{ id: string }>
}

const tabItems = [
  { id: 'identity', label: 'Identity' },
  { id: 'skills', label: 'Skills' },
  { id: 'activity', label: 'Activity' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'heartbeat', label: 'Heartbeat' },
]

export default function AgentDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { agent, loading, error } = useAgent(id)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex flex-col w-full self-stretch">
        {/* Summary bar skeleton */}
        <div className="flex items-center gap-4 bg-secondary border-b border-secondary px-8 py-4 w-full">
          <div className="h-5 w-20 animate-pulse rounded bg-secondary" />
          <div className="h-12 w-12 animate-pulse rounded-full bg-secondary" />
          <div className="flex flex-col gap-2">
            <div className="h-7 w-40 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
          </div>
        </div>
        {/* Tab strip skeleton */}
        <div className="flex items-center gap-3 border-b border-secondary px-8 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-20 animate-pulse rounded bg-secondary" />
          ))}
        </div>
        {/* Content skeleton */}
        <div className="flex flex-col gap-4 px-8 py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-secondary" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 w-full self-stretch py-24">
        <FeaturedIcon icon={<AlertCircle />} color="error" variant="light" size="lg" />
        <div className="text-center">
          <h2 className="text-[16px] font-[600] text-primary">Failed to load agent</h2>
          <p className="mt-1 text-[14px] text-tertiary">{error}</p>
        </div>
        <Button color="link-gray" size="sm" onClick={() => router.push('/agents')}>
          Go back
        </Button>
      </div>
    )
  }

  // ── Not found state ──
  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 w-full self-stretch py-24">
        <FeaturedIcon icon={<SearchMd />} color="gray" variant="light" size="lg" />
        <div className="text-center">
          <h2 className="text-[16px] font-[600] text-primary">Agent not found</h2>
          <p className="mt-1 text-[14px] text-tertiary">This agent may have been deleted.</p>
        </div>
        <Button color="link-gray" size="sm" href="/agents">
          Back to agents
        </Button>
      </div>
    )
  }

  // ── Populated state ──
  return (
    <div className="flex flex-col w-full self-stretch">
      {/* Summary bar */}
      <AgentDetailSummaryBar
        agent={agent}
        onDelete={() => setIsDeleting(true)}
        isDeleting={isDeleting}
      />

      {/* Tabs */}
      <div className="flex flex-col flex-1 px-8 pt-6">
        <Tabs defaultSelectedKey="identity">
          <TabList type="underline" size="sm">
            {tabItems.map((item) => (
              <Tab key={item.id} id={item.id}>{item.label}</Tab>
            ))}
          </TabList>

          <TabPanel id="identity" className="pt-6">
            <div className="py-4 text-tertiary text-sm">Identity tab content</div>
          </TabPanel>

          <TabPanel id="skills" className="pt-6">
            <div className="py-4 text-tertiary text-sm">Skills tab content</div>
          </TabPanel>

          <TabPanel id="activity" className="pt-6">
            <div className="py-4 text-tertiary text-sm">Activity tab content</div>
          </TabPanel>

          <TabPanel id="permissions" className="pt-6">
            <div className="py-4 text-tertiary text-sm">Permissions tab content</div>
          </TabPanel>

          <TabPanel id="heartbeat" className="pt-6">
            <div className="py-4 text-tertiary text-sm">Heartbeat tab content</div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  )
}
