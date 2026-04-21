'use client'

import { Button, cx } from '@circos/ui'
import { AlertTriangle } from '@untitledui/icons'

interface OAuthReconnectBannerProps {
  visible: boolean
}

export function OAuthReconnectBanner({ visible }: OAuthReconnectBannerProps) {
  if (!visible) return null

  const handleReconnect = () => {
    window.open('/api/auth/openai', '_blank')
  }

  return (
    <div
      className={cx(
        'flex w-full items-center justify-between gap-3 border-b border-warning px-4',
        'bg-secondary'
      )}
      style={{ height: 48, paddingTop: 12, paddingBottom: 12 }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0 text-fg-warning-primary" />
        <span className="text-sm font-semibold text-primary">
          Conexion con Codex expirada
        </span>
      </div>
      <Button
        color="secondary"
        size="sm"
        onPress={handleReconnect}
      >
        Reconectar
      </Button>
    </div>
  )
}
