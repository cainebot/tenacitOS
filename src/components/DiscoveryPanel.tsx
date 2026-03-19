'use client'

import { useState, useEffect } from 'react'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar skills en skills.sh..."
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontFamily: 'var(--font-body)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Loading state */}
      {loading && (
        <p style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          margin: 0,
        }}>
          Buscando...
        </p>
      )}

      {/* Empty state */}
      {!loading && query.trim() && results.length === 0 && (
        <p style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          margin: 0,
        }}>
          No se encontraron skills para &quot;{query}&quot;.
        </p>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {results.map((skill) => (
            <div
              key={skill.slug}
              onClick={() => onSelect(skill)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-elevated)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                }}>
                  {skill.displayName}
                </span>
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor:
                    skill.source === 'skills_sh'
                      ? 'var(--accent)'
                      : skill.source === 'clawhub'
                      ? '#6366f1'
                      : 'var(--border)',
                  color:
                    skill.source === 'skills_sh' || skill.source === 'clawhub'
                      ? '#fff'
                      : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'nowrap',
                }}>
                  {skill.source === 'skills_sh'
                    ? 'skills.sh'
                    : skill.source === 'clawhub'
                    ? 'ClawHub'
                    : 'GitHub'}
                </span>
              </div>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
              }}>
                {skill.summary ?? 'Sin descripcion'}
              </span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
              }}>
                {skill.version ? `v${skill.version}` : 'v1.0.0'} · {skill.slug}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
