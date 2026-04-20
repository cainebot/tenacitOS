import { describe, it, expect } from 'vitest';
import { isActiveRun, ACTIVE_RUN_STATUSES } from '../run-status';
import type { AgentRunRow } from '../../types/supabase';

// Minimal shape helper: isActiveRun only reads `status`, so we can pass a
// partial row safely via an `unknown` upcast (no `any`).
function rowWithStatus(status: AgentRunRow['status']): AgentRunRow {
  return { status } as unknown as AgentRunRow;
}

describe('lib/run-status', () => {
  it('queued → true', () => { expect(isActiveRun('queued')).toBe(true); });
  it('running → true', () => { expect(isActiveRun('running')).toBe(true); });
  it('completed → false', () => { expect(isActiveRun('completed')).toBe(false); });
  it('failed → false', () => { expect(isActiveRun('failed')).toBe(false); });
  it('cancelled → false', () => { expect(isActiveRun('cancelled')).toBe(false); });
  it('null → false', () => { expect(isActiveRun(null)).toBe(false); });
  it('undefined → false', () => { expect(isActiveRun(undefined)).toBe(false); });
  it('ACTIVE_RUN_STATUSES is exactly [queued, running]', () => {
    expect([...ACTIVE_RUN_STATUSES]).toEqual(['queued', 'running']);
  });
  it('accepts whole row', () => {
    expect(isActiveRun(rowWithStatus('running'))).toBe(true);
    expect(isActiveRun(rowWithStatus('completed'))).toBe(false);
  });
});
