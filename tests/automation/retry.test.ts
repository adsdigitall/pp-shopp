import { describe, expect, it } from 'vitest';
import {
  applyShareJobFailure,
  createShareJob,
  RETRY_POLICY,
  transitionShareJob,
} from '../../src/automation/index.ts';
import { validShareJobInput } from './fixtures.ts';

function startProcessing(now: Date) {
  return transitionShareJob(createShareJob(validShareJobInput(), { now: () => now }), 'processing', {
    now: () => now,
  });
}

describe('ShareJob retry model', () => {
  it('uses 3 attempts with wait between failures', () => {
    expect(RETRY_POLICY.maxAttempts).toBe(3);
    expect(RETRY_POLICY.backoffMsAfterAttempt).toEqual([1_000, 5_000]);
  });

  it('attempt 1 failure schedules retry (pending) after wait', () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    const afterFirst = applyShareJobFailure(startProcessing(t0), 'network error', {
      now: () => t0,
    });

    expect(afterFirst.attempts).toBe(1);
    expect(afterFirst.status).toBe('pending');
    expect(afterFirst.error).toBe('network error');
    expect(afterFirst.nextAttemptAt).toBe('2026-08-25T18:00:01.000Z');
    expect(afterFirst.sentAt).toBeNull();
  });

  it('attempt 2 failure schedules a longer wait', () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    const afterFirst = applyShareJobFailure(startProcessing(t0), 'fail-1', { now: () => t0 });
    const t1 = new Date('2026-08-25T18:00:01.000Z');
    const processing2 = transitionShareJob(afterFirst, 'processing', { now: () => t1 });
    const afterSecond = applyShareJobFailure(processing2, 'fail-2', { now: () => t1 });

    expect(afterSecond.attempts).toBe(2);
    expect(afterSecond.status).toBe('pending');
    expect(afterSecond.nextAttemptAt).toBe('2026-08-25T18:00:06.000Z');
  });

  it('attempt 3 failure marks the job failed and stops retrying', () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    const afterFirst = applyShareJobFailure(startProcessing(t0), 'fail-1', { now: () => t0 });
    const t1 = new Date('2026-08-25T18:00:01.000Z');
    const afterSecond = applyShareJobFailure(
      transitionShareJob(afterFirst, 'processing', { now: () => t1 }),
      'fail-2',
      { now: () => t1 },
    );
    const t2 = new Date('2026-08-25T18:00:06.000Z');
    const afterThird = applyShareJobFailure(
      transitionShareJob(afterSecond, 'processing', { now: () => t2 }),
      'fail-3',
      { now: () => t2 },
    );

    expect(afterThird.attempts).toBe(3);
    expect(afterThird.status).toBe('failed');
    expect(afterThird.nextAttemptAt).toBeNull();
    expect(afterThird.error).toBe('fail-3');
    expect(afterThird.sentAt).toBeNull();
  });

  it('does not apply retry unless the job is processing', () => {
    const pending = createShareJob(validShareJobInput());
    expect(() => applyShareJobFailure(pending, 'nope')).toThrow(/processing/i);
  });
});
