'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function GoalRedirectPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    // Goal detail is now inline in the project page at ?goal=[id]
    // Without project context we cannot know which project to redirect to,
    // so redirect to dashboard as a safe fallback.
    void params.id
    router.replace('/')
  }, [router, params.id])

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-tertiary">Redirecting...</p>
    </div>
  )
}
