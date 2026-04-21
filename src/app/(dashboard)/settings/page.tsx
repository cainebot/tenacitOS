'use client'

import { useEffect, useState } from 'react'
import { Button, BadgeWithDot } from '@circos/ui'
import { cx } from '@circos/ui'
import { createBrowserClient } from '@/lib/supabase'

interface ProviderStatus {
  provider: string
  status: 'connected' | 'expired' | 'unconfigured'
  last_refreshed: string | null
}

export default function SettingsPage() {
  const [tokenStatus, setTokenStatus] = useState<ProviderStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const supabase = createBrowserClient()
        const { data } = await supabase
          .from('provider_token_status')
          .select('provider, status, last_refreshed')
          .eq('provider', 'openai')
          .single()

        if (data) {
          setTokenStatus(data as ProviderStatus)
        }
      } catch {
        // Non-fatal — show unconfigured state
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()

    // Refresh every 30 seconds (RESEARCH.md Assumption A4)
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [])

  const handleReconnect = () => {
    window.open('/api/auth/openai', '_blank')
  }

  const status = tokenStatus?.status ?? 'unconfigured'

  // Badge color mapping per UI-SPEC Color section
  const badgeColor = status === 'connected' ? 'success'
    : status === 'expired' ? 'error'
    : 'gray'

  // Badge label — Spanish per Copywriting Contract
  const badgeLabel = status === 'connected' ? 'Conectado'
    : status === 'expired' ? 'Expirado'
    : 'No configurado'

  // Button config per UI-SPEC ProviderCard spec
  const buttonLabel = status === 'connected' ? 'Conectado'
    : status === 'expired' ? 'Reconectar'
    : 'Conectar'
  const buttonColor = status === 'expired' ? 'primary'
    : status === 'unconfigured' ? 'secondary'
    : 'primary'
  const buttonDisabled = status === 'connected'

  // Timestamp per UI-SPEC Copywriting Contract
  const timestampText = tokenStatus?.last_refreshed
    ? `Última renovación: ${new Date(tokenStatus.last_refreshed).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : 'Sin conexión previa'

  return (
    <div className="flex-1 overflow-auto p-8">
      {/* Page heading — Sora 28px semibold per UI-SPEC Typography */}
      <h1 className="font-display text-[28px] font-semibold leading-[1.2] text-primary">
        Configuración
      </h1>

      {/* Section: Conexiones — Inter 20px semibold, mt-xl (32px) per UI-SPEC */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-primary">
          Conexiones
        </h2>

        {/* Provider Card — mt-6 (24px) per UI-SPEC */}
        <div className="mt-6 max-w-[560px]">
          {loading ? (
            <div className="animate-pulse rounded-xl border border-secondary bg-primary p-4">
              <div className="h-5 w-48 rounded bg-tertiary" />
              <div className="mt-2 h-4 w-32 rounded bg-tertiary" />
            </div>
          ) : (
            <div className={cx(
              'rounded-xl border border-secondary bg-primary p-4',
            )}>
              {/* Row 1: Provider name + badge */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-primary">
                    Codex (OpenAI)
                  </span>
                  <span className="text-sm text-tertiary">
                    {timestampText}
                  </span>
                </div>
                <BadgeWithDot
                  color={badgeColor}
                  type="pill-color"
                >
                  {badgeLabel}
                </BadgeWithDot>
              </div>

              {/* Row 2: Action button */}
              <div className="mt-4 flex justify-end">
                <Button
                  color={buttonColor as 'primary' | 'secondary'}
                  size="sm"
                  isDisabled={buttonDisabled}
                  onPress={handleReconnect}
                >
                  {buttonLabel}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
