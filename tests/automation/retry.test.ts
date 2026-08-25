import { describe, expect, it } from 'vitest';
import {
  applyShareJobFailure,
  createShareJob,
  isShareJobDue,
  RETRY_POLICY,
  transitionShareJob,
} from '../../src/automation/index.ts';
import { validShareJobInput } from './fixtures.ts';

function startProcessing(now: Date) {
  const clock = { now: () => now };
  return transitionShareJob(createShareJob(validShareJobInput(), clock), 'processing', {
    clock,
  });
}

describe('ShareJob retry model', () => {
  it('usa 3 tentativas com espera entre falhas', () => {
    expect(RETRY_POLICY.maxAttempts).toBe(3);
    expect(RETRY_POLICY.backoffMsAfterAttempt).toEqual([1_000, 5_000]);
  });

  it('falha 1 agenda retry (pending) após espera', () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    const afterFirst = applyShareJobFailure(startProcessing(t0), 'network error', {
      clock: { now: () => t0 },
    });

    expect(afterFirst.attempts).toBe(1);
    expect(afterFirst.status).toBe('pending');
    expect(afterFirst.error).toBe('network error');
    expect(afterFirst.nextAttemptAt).toBe('2026-08-25T18:00:01.000Z');
    expect(afterFirst.sentAt).toBeNull();
  });

  it('falha 2 agenda espera maior', () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    const afterFirst = applyShareJobFailure(startProcessing(t0), 'fail-1', {
      clock: { now: () => t0 },
    });
    const t1 = new Date('2026-08-25T18:00:01.000Z');
    const clock1 = { now: () => t1 };
    const processing2 = transitionShareJob(afterFirst, 'processing', { clock: clock1 });
    const afterSecond = applyShareJobFailure(processing2, 'fail-2', { clock: clock1 });

    expect(afterSecond.attempts).toBe(2);
    expect(afterSecond.status).toBe('pending');
    expect(afterSecond.nextAttemptAt).toBe('2026-08-25T18:00:06.000Z');
  });

  it('falha 3 marca failed e para de tentar', () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    const afterFirst = applyShareJobFailure(startProcessing(t0), 'fail-1', {
      clock: { now: () => t0 },
    });
    const t1 = new Date('2026-08-25T18:00:01.000Z');
    const clock1 = { now: () => t1 };
    const afterSecond = applyShareJobFailure(
      transitionShareJob(afterFirst, 'processing', { clock: clock1 }),
      'fail-2',
      { clock: clock1 },
    );
    const t2 = new Date('2026-08-25T18:00:06.000Z');
    const clock2 = { now: () => t2 };
    const afterThird = applyShareJobFailure(
      transitionShareJob(afterSecond, 'processing', { clock: clock2 }),
      'fail-3',
      { clock: clock2 },
    );

    expect(afterThird.attempts).toBe(3);
    expect(afterThird.status).toBe('failed');
    expect(afterThird.nextAttemptAt).toBeNull();
    expect(afterThird.error).toBe('fail-3');
    expect(afterThird.sentAt).toBeNull();
  });

  it('não aplica retry se o job não estiver processing', () => {
    const pending = createShareJob(validShareJobInput());
    expect(() => applyShareJobFailure(pending, 'nope')).toThrow(/processing/i);
  });

  it('isShareJobDue respeita nextAttemptAt', () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    const afterFirst = applyShareJobFailure(startProcessing(t0), 'fail-1', {
      clock: { now: () => t0 },
    });

    expect(isShareJobDue(afterFirst, { now: () => t0 })).toBe(false);
    expect(
      isShareJobDue(afterFirst, { now: () => new Date('2026-08-25T18:00:01.000Z') }),
    ).toBe(true);
  });
});
