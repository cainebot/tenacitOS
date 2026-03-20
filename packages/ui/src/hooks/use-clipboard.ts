"use client"

import { useState, useCallback, useRef } from "react"

interface UseClipboardOptions {
  /** Duration in ms before `copied` resets to false. Default: 2000 */
  timeout?: number
}

interface UseClipboardReturn {
  /** Copy text to the clipboard. Returns true on success. */
  copy: (text: string) => Promise<boolean>
  /** Whether a value was recently copied. Resets after timeout. */
  copied: boolean
}

/**
 * Provides a `copy` function and a `copied` status flag for clipboard operations.
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const { timeout = 2000 } = options
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!navigator?.clipboard) {
        console.warn("useClipboard: Clipboard API not available")
        return false
      }

      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)

        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }

        timerRef.current = setTimeout(() => {
          setCopied(false)
          timerRef.current = null
        }, timeout)

        return true
      } catch (error) {
        console.error("useClipboard: Failed to copy", error)
        setCopied(false)
        return false
      }
    },
    [timeout],
  )

  return { copy, copied }
}

export type { UseClipboardOptions, UseClipboardReturn }
