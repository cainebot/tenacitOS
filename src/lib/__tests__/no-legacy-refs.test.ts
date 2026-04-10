import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Gap 3: Legacy reference regression tests.
// Requirements: SCHM-01
//
// Verify that all legacy identifiers (card_activity, CardActivityRow,
// scrum_master_agent_id, scrumMasterAgentId, cardActivityToActivityEvents)
// have been purged from the TypeScript source tree under control-panel/src/.
// ---------------------------------------------------------------------------

// Resolve absolute path to the control-panel/src directory
const SRC_DIR = path.resolve(__dirname, '../../../')

/**
 * Run a grep for a literal pattern in .ts/.tsx files under the given directory.
 * Excludes the __tests__ directory itself so test file string literals don't trigger matches.
 * Returns the list of matching file paths, or an empty array if no matches.
 */
function grepSrc(pattern: string): string[] {
  try {
    const result = execSync(
      `grep -r --include="*.ts" --include="*.tsx" --exclude-dir="__tests__" -l "${pattern}" "${SRC_DIR}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    )
    // grep exits 0 with output when matches are found
    return result.trim().split('\n').filter(Boolean)
  } catch (err: unknown) {
    // grep exits 1 when no matches are found — that is the expected success case
    const execError = err as { status?: number }
    if (execError.status === 1) return []
    throw err
  }
}

describe('no legacy card_activity references in TypeScript source', () => {
  it('zero .ts/.tsx files contain the string "card_activity"', () => {
    const matches = grepSrc('card_activity')
    expect(matches).toHaveLength(0)
  })
})

describe('no legacy CardActivityRow type references in TypeScript source', () => {
  it('zero .ts/.tsx files contain the string "CardActivityRow"', () => {
    const matches = grepSrc('CardActivityRow')
    expect(matches).toHaveLength(0)
  })
})

describe('no legacy scrum_master_agent_id references in TypeScript source', () => {
  it('zero .ts/.tsx files contain the string "scrum_master_agent_id"', () => {
    const matches = grepSrc('scrum_master_agent_id')
    expect(matches).toHaveLength(0)
  })
})

describe('no legacy scrumMasterAgentId references in TypeScript source', () => {
  it('zero .ts/.tsx files contain the string "scrumMasterAgentId"', () => {
    const matches = grepSrc('scrumMasterAgentId')
    expect(matches).toHaveLength(0)
  })
})

describe('no legacy cardActivityToActivityEvents function references in TypeScript source', () => {
  it('zero .ts/.tsx files contain the string "cardActivityToActivityEvents"', () => {
    const matches = grepSrc('cardActivityToActivityEvents')
    expect(matches).toHaveLength(0)
  })
})
