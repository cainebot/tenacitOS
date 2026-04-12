'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Input, ProgressBar, BadgeWithDot, cx } from '@circos/ui'
import type { GoalType, NumberFormat, GoalRow } from '@/types/project'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GoalInputMode = 'numeric' | 'boolean'

interface GoalProgressProps {
  goalType: GoalType
  numberFormat: NumberFormat
  initialValue: number | null
  currentValue: number | null
  targetValue: number | null
  booleanInitial: 'planning' | 'in_progress' | null
  booleanCurrent: 'planning' | 'in_progress' | 'complete' | null
  onUpdate: (
    fields: Partial<
      Pick<
        GoalRow,
        | 'goal_type'
        | 'number_format'
        | 'initial_value'
        | 'current_value'
        | 'target_value'
        | 'boolean_initial'
        | 'boolean_current'
      >
    >
  ) => void
  disabled?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type BooleanOption =
  | { value: 'planning'; label: 'Planning' }
  | { value: 'in_progress'; label: 'In progress' }
  | { value: 'complete'; label: 'Complete' }

const booleanOptionsByField: Record<
  'initial' | 'current' | 'target',
  BooleanOption[]
> = {
  initial: [
    { value: 'planning', label: 'Planning' },
    { value: 'in_progress', label: 'In progress' },
  ],
  current: [
    { value: 'planning', label: 'Planning' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'complete', label: 'Complete' },
  ],
  target: [{ value: 'complete', label: 'Complete' }],
}

const booleanColorMap = {
  planning: 'gray',
  in_progress: 'brand',
  complete: 'success',
} as const

const booleanLabelMap = {
  planning: 'Planning',
  in_progress: 'In progress',
  complete: 'Complete',
}

function calcProgress(
  mode: GoalInputMode,
  initialValue: number | null,
  currentValue: number | null,
  targetValue: number | null,
  booleanCurrent: 'planning' | 'in_progress' | 'complete' | null
): number {
  if (mode === 'boolean') {
    return booleanCurrent === 'complete' ? 100 : 0
  }
  if (
    targetValue !== null &&
    initialValue !== null &&
    currentValue !== null &&
    targetValue !== initialValue
  ) {
    return Math.max(
      0,
      Math.min(
        100,
        ((currentValue - initialValue) / (targetValue - initialValue)) * 100
      )
    )
  }
  return 0
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalProgress({
  goalType,
  numberFormat,
  initialValue,
  currentValue,
  targetValue,
  booleanInitial,
  booleanCurrent,
  onUpdate,
  disabled = false,
}: GoalProgressProps) {
  const [mode, setMode] = useState<GoalInputMode>(goalType)
  const [showBooleanDropdown, setShowBooleanDropdown] = useState(false)
  const [activeDropdownField, setActiveDropdownField] = useState<
    'initial' | 'current' | 'target' | null
  >(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync mode with goalType prop
  useEffect(() => {
    setMode(goalType)
  }, [goalType])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showBooleanDropdown) return

    function handleMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowBooleanDropdown(false)
        setActiveDropdownField(null)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [showBooleanDropdown])

  const progress = calcProgress(
    mode,
    initialValue,
    currentValue,
    targetValue,
    booleanCurrent
  )

  // ---- Numeric mode handlers ----

  const handleNumericChange = useCallback(
    (
      field: 'initial_value' | 'current_value' | 'target_value',
      rawValue: string
    ) => {
      const parsed = rawValue === '' ? null : parseFloat(rawValue)
      onUpdate({ [field]: isNaN(parsed as number) ? null : parsed })
    },
    [onUpdate]
  )

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      field: 'initial' | 'current' | 'target'
    ) => {
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault()
        setShowBooleanDropdown(true)
        setActiveDropdownField(field)
      }
    },
    []
  )

  const handleInputBlur = useCallback(() => {
    // If dropdown not open, just close — blur without selection resets nothing
    // The input retains its numeric value; the letter keystroke was prevented
  }, [])

  // ---- Boolean dropdown handler ----

  const handleBooleanSelect = useCallback(
    (
      optionValue: 'planning' | 'in_progress' | 'complete',
      field: 'initial' | 'current' | 'target'
    ) => {
      setMode('boolean')
      setShowBooleanDropdown(false)
      setActiveDropdownField(null)

      onUpdate({
        goal_type: 'boolean',
        boolean_initial:
          field === 'initial'
            ? (optionValue as 'planning' | 'in_progress')
            : 'planning',
        boolean_current:
          field === 'current' ? optionValue : 'in_progress',
        initial_value: null,
        current_value: null,
        target_value: null,
      })
    },
    [onUpdate]
  )

  // ---- Badge clear handler (reverts to numeric) ----

  const handleBadgeClear = useCallback(() => {
    setMode('numeric')
    onUpdate({
      goal_type: 'numeric',
      boolean_initial: null,
      boolean_current: null,
      initial_value: 0,
      current_value: 0,
      target_value: 0,
    })
  }, [onUpdate])

  // ---- Boolean badge cycle for current field ----

  const handleCurrentCycle = useCallback(() => {
    const order: Array<'planning' | 'in_progress' | 'complete'> = [
      'planning',
      'in_progress',
      'complete',
    ]
    const idx = order.indexOf(booleanCurrent ?? 'planning')
    const next = order[(idx + 1) % order.length]
    onUpdate({ boolean_current: next })
  }, [booleanCurrent, onUpdate])

  const handleInitialCycle = useCallback(() => {
    const next =
      booleanInitial === 'planning' ? 'in_progress' : 'planning'
    onUpdate({ boolean_initial: next })
  }, [booleanInitial, onUpdate])

  const percentSuffix = numberFormat === 'percentage' ? '%' : ''

  // ---- Render ----

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* ---- Numeric mode ---- */}
      {mode === 'numeric' && (
        <>
          {/* Column 1: Initial */}
          <div className="relative flex flex-col gap-1.5">
            <span className="text-xs font-medium text-tertiary">Initial</span>
            <div className="relative">
              <Input
                type="number"
                value={initialValue !== null ? String(initialValue) : ''}
                onChange={(e) =>
                  handleNumericChange('initial_value', e.target.value)
                }
                onKeyDown={(e) => handleKeyDown(e, 'initial')}
                onBlur={handleInputBlur}
                isDisabled={disabled}
                trailingElement={
                  percentSuffix ? (
                    <span className="text-sm text-quaternary">
                      {percentSuffix}
                    </span>
                  ) : undefined
                }
              />
              {showBooleanDropdown && activeDropdownField === 'initial' && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 mt-1 rounded-lg border border-secondary bg-primary shadow-lg p-1 min-w-[140px]"
                >
                  {booleanOptionsByField.initial.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary_hover rounded-md text-secondary"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleBooleanSelect(opt.value, 'initial')
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Current */}
          <div className="relative flex flex-col gap-1.5">
            <span className="text-xs font-medium text-tertiary">Current</span>
            <div className="relative">
              <Input
                type="number"
                value={currentValue !== null ? String(currentValue) : ''}
                onChange={(e) =>
                  handleNumericChange('current_value', e.target.value)
                }
                onKeyDown={(e) => handleKeyDown(e, 'current')}
                onBlur={handleInputBlur}
                isDisabled={disabled}
                trailingElement={
                  percentSuffix ? (
                    <span className="text-sm text-quaternary">
                      {percentSuffix}
                    </span>
                  ) : undefined
                }
              />
              {showBooleanDropdown && activeDropdownField === 'current' && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 mt-1 rounded-lg border border-secondary bg-primary shadow-lg p-1 min-w-[140px]"
                >
                  {booleanOptionsByField.current.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary_hover rounded-md text-secondary"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleBooleanSelect(opt.value, 'current')
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Target */}
          <div className="relative flex flex-col gap-1.5">
            <span className="text-xs font-medium text-tertiary">Target</span>
            <div className="relative">
              <Input
                type="number"
                value={targetValue !== null ? String(targetValue) : ''}
                onChange={(e) =>
                  handleNumericChange('target_value', e.target.value)
                }
                onKeyDown={(e) => handleKeyDown(e, 'target')}
                onBlur={handleInputBlur}
                isDisabled={disabled}
                trailingElement={
                  percentSuffix ? (
                    <span className="text-sm text-quaternary">
                      {percentSuffix}
                    </span>
                  ) : undefined
                }
              />
              {showBooleanDropdown && activeDropdownField === 'target' && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 mt-1 rounded-lg border border-secondary bg-primary shadow-lg p-1 min-w-[140px]"
                >
                  {booleanOptionsByField.target.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary_hover rounded-md text-secondary"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        handleBooleanSelect(opt.value, 'target')
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ---- Boolean mode ---- */}
      {mode === 'boolean' && (
        <>
          {/* Column 1: Initial (boolean) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-tertiary">Initial</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex items-center"
                onClick={handleInitialCycle}
                disabled={disabled}
                aria-label="Cycle initial boolean value"
              >
                <BadgeWithDot
                  color={
                    booleanColorMap[booleanInitial ?? 'planning']
                  }
                  type="pill-color"
                  size="sm"
                >
                  {booleanLabelMap[booleanInitial ?? 'planning']}
                </BadgeWithDot>
              </button>
              <button
                type="button"
                className={cx(
                  'ml-1 text-xs text-tertiary hover:text-error-primary leading-none',
                  disabled && 'pointer-events-none opacity-50'
                )}
                onClick={handleBadgeClear}
                disabled={disabled}
                aria-label="Clear boolean mode, revert to numeric"
              >
                ×
              </button>
            </div>
          </div>

          {/* Column 2: Current (boolean) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-tertiary">Current</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex items-center"
                onClick={handleCurrentCycle}
                disabled={disabled}
                aria-label="Cycle current boolean value"
              >
                <BadgeWithDot
                  color={
                    booleanColorMap[booleanCurrent ?? 'planning']
                  }
                  type="pill-color"
                  size="sm"
                >
                  {booleanLabelMap[booleanCurrent ?? 'planning']}
                </BadgeWithDot>
              </button>
            </div>
          </div>

          {/* Column 3: Target (boolean — always Complete, not editable per D-11) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-tertiary">Target</span>
            <BadgeWithDot color="success" type="pill-color" size="sm">
              Complete
            </BadgeWithDot>
          </div>
        </>
      )}

      {/* Column 4: Progress (shared across modes) */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-tertiary">Progress</span>
        <div className="flex flex-col gap-1">
          <ProgressBar value={progress} />
          <span className="text-sm text-secondary">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  )
}
