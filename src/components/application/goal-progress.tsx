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
// Constants
// ---------------------------------------------------------------------------

type BooleanValue = 'planning' | 'in_progress' | 'complete'

interface BooleanOption {
  value: BooleanValue
  label: string
}

const booleanOptions: BooleanOption[] = [
  { value: 'planning', label: 'Iniciada' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'complete', label: 'Completada' },
]

const booleanColorMap: Record<BooleanValue, 'gray' | 'brand' | 'success'> = {
  planning: 'gray',
  in_progress: 'brand',
  complete: 'success',
}

const booleanLabelMap: Record<BooleanValue, string> = {
  planning: 'Iniciada',
  in_progress: 'En progreso',
  complete: 'Completada',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Parse a text value as a number, stripping trailing % */
function parseNumericText(text: string): { value: number; isPercentage: boolean } {
  const trimmed = text.trim()
  const isPercentage = trimmed.endsWith('%')
  const numStr = isPercentage ? trimmed.slice(0, -1).trim() : trimmed
  const parsed = parseFloat(numStr)
  return {
    value: isNaN(parsed) ? 0 : parsed,
    isPercentage,
  }
}

/** Check if a string contains any letter characters */
function hasLetters(text: string): boolean {
  return /[a-zA-Z]/.test(text)
}

// ---------------------------------------------------------------------------
// Per-cell state
// ---------------------------------------------------------------------------

interface CellState {
  editing: boolean
  inputText: string
  showDropdown: boolean
  highlightedIndex: number
}

const defaultCellState: CellState = {
  editing: false,
  inputText: '',
  showDropdown: false,
  highlightedIndex: -1,
}

type CellField = 'initial' | 'current' | 'target'

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

  const [initialCell, setInitialCell] = useState<CellState>(defaultCellState)
  const [currentCell, setCurrentCell] = useState<CellState>(defaultCellState)
  const [targetCell, setTargetCell] = useState<CellState>(defaultCellState)

  const initialInputRef = useRef<HTMLInputElement>(null)
  const currentInputRef = useRef<HTMLInputElement>(null)
  const targetInputRef = useRef<HTMLInputElement>(null)

  const initialDropdownRef = useRef<HTMLDivElement>(null)
  const currentDropdownRef = useRef<HTMLDivElement>(null)
  const targetDropdownRef = useRef<HTMLDivElement>(null)

  // Sync mode with goalType prop
  useEffect(() => {
    setMode(goalType)
  }, [goalType])

  // When mode changes to boolean, ensure cells are not in editing state
  useEffect(() => {
    if (mode === 'boolean') {
      setInitialCell(defaultCellState)
      setCurrentCell(defaultCellState)
      setTargetCell(defaultCellState)
    }
  }, [mode])

  // Helper to get cell state & setter by field
  const getCellAccessor = useCallback(
    (field: CellField) => {
      switch (field) {
        case 'initial':
          return { state: initialCell, setState: setInitialCell, ref: initialInputRef, dropdownRef: initialDropdownRef }
        case 'current':
          return { state: currentCell, setState: setCurrentCell, ref: currentInputRef, dropdownRef: currentDropdownRef }
        case 'target':
          return { state: targetCell, setState: setTargetCell, ref: targetInputRef, dropdownRef: targetDropdownRef }
      }
    },
    [initialCell, currentCell, targetCell]
  )

  // Numeric value for display
  const getNumericDisplay = useCallback(
    (field: CellField): string => {
      const val =
        field === 'initial'
          ? initialValue
          : field === 'current'
            ? currentValue
            : targetValue
      if (val === null) return '0'
      return numberFormat === 'percentage' ? `${val}%` : String(val)
    },
    [initialValue, currentValue, targetValue, numberFormat]
  )

  // Close dropdown on outside click
  useEffect(() => {
    const anyDropdownOpen =
      initialCell.showDropdown || currentCell.showDropdown || targetCell.showDropdown

    if (!anyDropdownOpen) return

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node
      const refs = [initialDropdownRef, currentDropdownRef, targetDropdownRef]
      const isInsideDropdown = refs.some(
        (ref) => ref.current && ref.current.contains(target)
      )
      if (!isInsideDropdown) {
        setInitialCell((s) => ({ ...s, showDropdown: false, highlightedIndex: -1 }))
        setCurrentCell((s) => ({ ...s, showDropdown: false, highlightedIndex: -1 }))
        setTargetCell((s) => ({ ...s, showDropdown: false, highlightedIndex: -1 }))
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [initialCell.showDropdown, currentCell.showDropdown, targetCell.showDropdown])

  // Filter dropdown options based on inputText
  const getFilteredOptions = useCallback(
    (inputText: string): BooleanOption[] => {
      if (inputText.length < 3) return booleanOptions
      const lower = inputText.toLowerCase()
      return booleanOptions.filter((opt) =>
        opt.label.toLowerCase().includes(lower)
      )
    },
    []
  )

  // ---- Input change handler ----

  const handleInputChange = useCallback(
    (field: CellField, value: string) => {
      const { setState } = getCellAccessor(field)
      const showDropdown = hasLetters(value)
      setState((s) => ({
        ...s,
        inputText: value,
        showDropdown,
        highlightedIndex: showDropdown ? 0 : -1,
      }))
    },
    [getCellAccessor]
  )

  // ---- Input blur handler ----

  const handleInputBlur = useCallback(
    (field: CellField) => {
      const { state, setState } = getCellAccessor(field)

      // Small delay to allow dropdown click to fire first
      setTimeout(() => {
        setState((s) => {
          // If dropdown was already closed by a selection, skip
          if (!s.editing) return s

          const text = s.inputText.trim()

          // If text has letters or is empty, reset to numeric display
          if (hasLetters(text) || text === '') {
            return { ...defaultCellState }
          }

          // Text is numeric — commit value
          const { value: numericValue, isPercentage } = parseNumericText(text)

          // If we were in boolean mode (badge was clicked, user typed a number),
          // convert back to numeric
          if (mode === 'boolean') {
            const fieldMap: Record<CellField, 'initial_value' | 'current_value' | 'target_value'> = {
              initial: 'initial_value',
              current: 'current_value',
              target: 'target_value',
            }
            onUpdate({
              goal_type: 'numeric',
              number_format: isPercentage ? 'percentage' : 'natural',
              [fieldMap[field]]: numericValue,
              // Reset other fields to 0
              ...(field !== 'initial' && { initial_value: 0 }),
              ...(field !== 'current' && { current_value: 0 }),
              ...(field !== 'target' && { target_value: 0 }),
              boolean_initial: null,
              boolean_current: null,
            })
            setMode('numeric')
          } else {
            // Already in numeric mode — just update this field
            const fieldMap: Record<CellField, 'initial_value' | 'current_value' | 'target_value'> = {
              initial: 'initial_value',
              current: 'current_value',
              target: 'target_value',
            }
            onUpdate({
              number_format: isPercentage ? 'percentage' : 'natural',
              [fieldMap[field]]: numericValue,
            })
          }

          return { ...defaultCellState }
        })
      }, 150)
    },
    [getCellAccessor, mode, onUpdate]
  )

  // ---- Boolean select handler ----

  const handleBooleanSelect = useCallback(
    (optionValue: BooleanValue, field: CellField) => {
      setMode('boolean')

      // Close all cells
      setInitialCell(defaultCellState)
      setCurrentCell(defaultCellState)
      setTargetCell(defaultCellState)

      // Build defaults for non-edited fields
      const newInitial: 'planning' | 'in_progress' =
        field === 'initial'
          ? (optionValue as 'planning' | 'in_progress')
          : booleanInitial ?? 'planning'
      const newCurrent: BooleanValue =
        field === 'current'
          ? optionValue
          : booleanCurrent ?? 'in_progress'

      onUpdate({
        goal_type: 'boolean',
        boolean_initial: newInitial,
        boolean_current: newCurrent,
        initial_value: null,
        current_value: null,
        target_value: null,
      })
    },
    [onUpdate, booleanInitial, booleanCurrent]
  )

  // ---- Badge click handler (revert to empty input with dropdown) ----

  const handleBadgeClick = useCallback(
    (field: CellField) => {
      if (disabled) return

      const { setState, ref } = getCellAccessor(field)
      setState({
        editing: true,
        inputText: '',
        showDropdown: true,
        highlightedIndex: 0,
      })

      // Focus the input after state update
      requestAnimationFrame(() => {
        ref.current?.focus()
      })
    },
    [disabled, getCellAccessor]
  )

  // ---- Keyboard navigation ----

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, field: CellField) => {
      const { state, setState } = getCellAccessor(field)
      if (!state.showDropdown) return

      const filtered = getFilteredOptions(state.inputText)
      if (filtered.length === 0) return

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          setState((s) => ({
            ...s,
            highlightedIndex: Math.min(s.highlightedIndex + 1, filtered.length - 1),
          }))
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setState((s) => ({
            ...s,
            highlightedIndex: Math.max(s.highlightedIndex - 1, 0),
          }))
          break
        }
        case 'Enter': {
          e.preventDefault()
          const idx = state.highlightedIndex >= 0 ? state.highlightedIndex : 0
          if (filtered[idx]) {
            handleBooleanSelect(filtered[idx].value, field)
          }
          break
        }
        case 'Escape': {
          e.preventDefault()
          setState((s) => ({
            ...s,
            showDropdown: false,
            highlightedIndex: -1,
          }))
          break
        }
      }
    },
    [getCellAccessor, getFilteredOptions, handleBooleanSelect]
  )

  // ---- Progress calc ----

  const progress = calcProgress(
    mode,
    initialValue,
    currentValue,
    targetValue,
    booleanCurrent
  )

  // ---- Render helpers ----

  /** Render a numeric input cell with dropdown */
  const renderNumericCell = (field: CellField) => {
    const { state, setState, ref, dropdownRef } = getCellAccessor(field)
    const filteredOptions = getFilteredOptions(state.inputText)

    return (
      <div
        className="relative flex flex-1 items-center h-[72px] px-6 py-4"
        onKeyDown={(e) => handleKeyDown(e, field)}
      >
        <Input
          type="text"
          value={state.editing ? state.inputText : getNumericDisplay(field)}
          onChange={(value: string) => {
            if (!state.editing) {
              // First keystroke in numeric mode
              setState((s) => ({ ...s, editing: true }))
            }
            handleInputChange(field, value)
          }}
          onFocus={() => {
            if (!state.editing) {
              setState((s) => ({
                ...s,
                editing: true,
                inputText: getNumericDisplay(field),
              }))
            }
          }}
          onBlur={() => handleInputBlur(field)}
          isDisabled={disabled}
          ref={ref}
        />
        {state.showDropdown && filteredOptions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-6 right-6 bottom-full mb-1 z-10 rounded-lg border border-secondary bg-primary shadow-lg p-1 min-w-[140px]"
          >
            {filteredOptions.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                className={cx(
                  'w-full text-left px-3 py-2 text-sm rounded-md text-secondary',
                  idx === state.highlightedIndex && 'bg-active'
                )}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleBooleanSelect(opt.value, field)
                }}
                onMouseEnter={() => {
                  setState((s) => ({ ...s, highlightedIndex: idx }))
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  /** Render a boolean badge cell (editable) */
  const renderBooleanCell = (
    field: CellField,
    value: BooleanValue
  ) => {
    const { state, setState, ref, dropdownRef } = getCellAccessor(field)
    const filteredOptions = getFilteredOptions(state.inputText)

    if (state.editing) {
      // Show input with dropdown (badge was clicked)
      return (
        <div
          className="relative flex flex-1 items-center h-[72px] px-6 py-4"
          onKeyDown={(e) => handleKeyDown(e, field)}
        >
          <Input
            type="text"
            value={state.inputText}
            onChange={(val: string) => handleInputChange(field, val)}
            onBlur={() => handleInputBlur(field)}
            isDisabled={disabled}
            ref={ref}
          />
          {state.showDropdown && filteredOptions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-6 right-6 bottom-full mb-1 z-10 rounded-lg border border-secondary bg-primary shadow-lg p-1 min-w-[140px]"
            >
              {filteredOptions.map((opt, idx) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cx(
                    'w-full text-left px-3 py-2 text-sm rounded-md text-secondary',
                    idx === state.highlightedIndex && 'bg-active'
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleBooleanSelect(opt.value, field)
                  }}
                  onMouseEnter={() => {
                    setState((s) => ({ ...s, highlightedIndex: idx }))
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Show badge
    return (
      <div className="flex flex-1 items-center h-[72px] px-6 py-4">
        <button
          type="button"
          className="flex items-center"
          onClick={() => handleBadgeClick(field)}
          disabled={disabled}
          aria-label={`Edit ${field} value`}
        >
          <BadgeWithDot
            color={booleanColorMap[value]}
            type="pill-color"
            size="sm"
          >
            {booleanLabelMap[value]}
          </BadgeWithDot>
        </button>
      </div>
    )
  }

  // ---- Main render ----

  return (
    <div className="overflow-clip rounded-xl border border-secondary bg-primary shadow-xs">
      {/* Header row */}
      <div className="flex items-center">
        <div className="flex flex-1 items-center border-b border-secondary h-10 px-5 py-2">
          <span className="text-xs font-semibold text-quaternary">Initial</span>
        </div>
        <div className="flex flex-1 items-center border-b border-secondary h-10 px-5 py-2">
          <span className="text-xs font-semibold text-quaternary">Current</span>
        </div>
        <div className="flex flex-1 items-center border-b border-secondary h-10 px-5 py-2">
          <span className="text-xs font-semibold text-quaternary">Target</span>
        </div>
        <div className="flex flex-1 items-center border-b border-secondary h-10 px-5 py-2">
          <span className="text-xs font-semibold text-quaternary">Progress</span>
        </div>
      </div>

      {/* Data row */}
      <div className="flex items-center">
        {mode === 'numeric' ? (
          <>
            {renderNumericCell('initial')}
            {renderNumericCell('current')}
            {renderNumericCell('target')}
          </>
        ) : (
          <>
            {renderBooleanCell('initial', booleanInitial ?? 'planning')}
            {renderBooleanCell('current', booleanCurrent ?? 'planning')}
            {/* Target is always non-editable Completada badge */}
            <div className="flex flex-1 items-center h-[72px] px-6 py-4">
              <BadgeWithDot color="success" type="pill-color" size="sm">
                Completada
              </BadgeWithDot>
            </div>
          </>
        )}

        {/* Cell 4: Progress — shared across modes */}
        <div className="flex flex-1 items-center h-[72px] px-6 py-4">
          <div className="flex-1 min-w-0">
            <ProgressBar value={progress} labelPosition="right" />
          </div>
        </div>
      </div>
    </div>
  )
}
