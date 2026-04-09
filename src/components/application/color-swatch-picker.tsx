'use client'

import { useEffect, useRef } from 'react'
import { Check } from '@untitledui/icons'
import { cx } from '@circos/ui'
import type { BadgeColor } from '@circos/ui'

export interface ColorEntry {
  hex: string
  name: string
  badgeColor: BadgeColor
}

export const COLOR_PALETTE: ColorEntry[] = [
  { hex: '#667085', name: 'Gray', badgeColor: 'gray' },
  { hex: '#444CE7', name: 'Brand', badgeColor: 'brand' },
  { hex: '#F04438', name: 'Error', badgeColor: 'error' },
  { hex: '#F79009', name: 'Warning', badgeColor: 'warning' },
  { hex: '#17B26A', name: 'Success', badgeColor: 'success' },
  { hex: '#2E90FA', name: 'Blue', badgeColor: 'blue' },
  { hex: '#7A5AF8', name: 'Purple', badgeColor: 'purple' },
  { hex: '#EE46BC', name: 'Pink', badgeColor: 'pink' },
  { hex: '#EF6820', name: 'Orange', badgeColor: 'orange' },
  { hex: '#6172F3', name: 'Indigo', badgeColor: 'indigo' },
]

export interface ColorSwatchPickerProps {
  currentColor: string
  onColorSelect: (hex: string) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ColorSwatchPicker({
  currentColor,
  onColorSelect,
  isOpen,
  onOpenChange,
}: ColorSwatchPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen, onOpenChange])

  if (!isOpen) return null

  return (
    <div
      ref={pickerRef}
      role="dialog"
      aria-label="Choose color"
      className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-secondary bg-secondary p-3 shadow-2xl"
    >
      <div className="grid grid-cols-5 gap-2">
        {COLOR_PALETTE.map(({ hex, name }) => (
          <button
            key={hex}
            type="button"
            aria-label={name}
            onClick={() => {
              onColorSelect(hex)
              onOpenChange(false)
            }}
            className={cx(
              'relative size-6 rounded-full transition-shadow hover:ring-2 hover:ring-offset-1',
            )}
            style={{ backgroundColor: hex }}
          >
            {currentColor === hex && (
              <Check className="absolute inset-0 m-auto size-3 text-white" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
