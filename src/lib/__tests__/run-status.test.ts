import { describe, it, expect } from 'vitest';
import { isActiveRun, ACTIVE_RUN_STATUSES } from '../run-status';

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
    expect(isActiveRun({ status: 'running' } as any)).toBe(true);
    expect(isActiveRun({ status: 'completed' } as any)).toBe(false);
  });
});
