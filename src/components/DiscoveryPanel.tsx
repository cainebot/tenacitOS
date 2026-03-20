'use client'

import { useState, useEffect } from 'react'
import { cx } from '@openclaw/ui'
import type { DiscoveredSkill } from '@/types/supabase'

interface DiscoveryPanelProps {
  initialQuery?: string;
  onSelect: (skill: DiscoveredSkill) => void;
}

export function DiscoveryPanel({ initialQuery = '', onSelect }: DiscoveryPanelProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<DiscoveredSkill[]>([])
  const [loading, setLoading] = useState(false)

  // Auto-search on mount if initialQuery is non-empty
  useEffect(() => {
    if (!initialQuery.trim()) return
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/skills/discover?q=${encodeURIComponent(initialQuery.trim())}`)
        const data = await res.json().catch(() => ({ results: [] }))
        setResults(data.results ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount with initialQuery

  // Debounced search on query change (user typing)
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/skills/discover?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json().catch(() => ({ results: [] }))
        setResults(data.results ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar skills en skills.sh..."
        className="w-full px-3 py-2 rounded-lg border border-secondary bg-tertiary text-primary text-sm font-sans outline-none box-border"
      />

      {/* Loading state */}
      {loading && (
        <p className="text-xs text-quaternary font-sans m-0">
          Buscando...
        </p>
      )}

      {/* Empty state */}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-xs text-quaternary font-sans m-0">
          No se encontraron skills para &quot;{query}&quot;.
        </p>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((skill) => (
            <div
              key={skill.slug}
              onClick={() => onSelect(skill)}
              className="px-3 py-2.5 rounded-lg border border-secondary bg-tertiary cursor-pointer flex flex-col gap-1 hover:border-accent transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-primary font-sans">
                  {skill.displayName}
                </span>
                <span className={cx(
                  'text-[10px] px-1.5 py-0.5 rounded font-sans whitespace-nowrap',
                  skill.source === 'skills_sh'
                    ? 'bg-brand-50 text-white'
                    : skill.source === 'clawhub'
                    ? 'bg-[#6366f1] text-white'
                    : 'bg-border text-quaternary'
                )}>
                  {skill.source === 'skills_sh'
                    ? 'skills.sh'
                    : skill.source === 'clawhub'
                    ? 'ClawHub'
                    : 'GitHub'}
                </span>
              </div>
              <span className="text-xs text-quaternary font-sans">
                {skill.summary ?? 'Sin descripcion'}
              </span>
              <span className="text-[11px] text-quaternary font-sans">
                {skill.version ? `v${skill.version}` : 'v1.0.0'} · {skill.slug}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
