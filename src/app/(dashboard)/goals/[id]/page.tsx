'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button, Badge, FeaturedIcon } from '@circos/ui'
import { ArrowNarrowLeft, Target04 } from '@untitledui/icons'
import type { GoalRow } from '@/types/project'

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [goal, setGoal] = useState<GoalRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/goals/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Goal not found')
        return r.json()
      })
      .then((data: GoalRow) => setGoal(data))
      .catch((err) => console.error('[goal-detail] Failed:', err))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse h-8 w-48 rounded bg-secondary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Back navigation */}
      <Button
        color="link-gray"
        size="sm"
        iconLeading={ArrowNarrowLeft}
        onClick={() => router.back()}
      >
        Back
      </Button>

      <div className="mt-6 space-y-4">
        {/* Goal title */}
        <h1 className="font-display text-xl font-semibold text-primary">
          {goal?.title ?? 'Goal not found'}
        </h1>

        {/* Level badge + status */}
        {goal && (
          <div className="flex items-center gap-2">
            <Badge color="gray" size="sm">
              {goal.level === 'company' ? 'Company' : 'Department'}
            </Badge>
            <Badge
              color={goal.status === 'active' ? 'success' : 'gray'}
              size="sm"
            >
              {goal.status}
            </Badge>
          </div>
        )}

        {/* Stub placeholder */}
        <div className="mt-8 flex flex-col items-center gap-3 py-12 text-center">
          <FeaturedIcon icon={<Target04 />} variant="light" size="md" />
          <p className="text-sm text-tertiary">
            Goal detail view — full editing, sub-goals, and linked projects coming in a future phase.
          </p>
        </div>
      </div>
    </div>
  )
}
