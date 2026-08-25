import { describe, expect, it } from 'vitest';
import {
  createShareJob,
  getLegalShareJobTransitions,
  SHARE_JOB_STATUSES,
  transitionShareJob,
} from '../../src/automation/index.ts';
import { validShareJobInput } from './fixtures.ts';

describe('ShareJob creation', () => {
  it('creates a job with status pending and attempts 0', () => {
    const job = createShareJob(validShareJobInput());

    expect(job.status).toBe('pending');
    expect(job.attempts).toBe(0);
    expect(job.maxAttempts).toBe(3);
    expect(job.sentAt).toBeNull();
    expect(job.error).toBeNull();
    expect(job.nextAttemptAt).toBeNull();
    expect(job.id).toMatch(/^share_/);
    expect(job.productId).toBe('prod-001');
    expect(job.destinationId).toBe('dest-whatsapp-grupo-ofertas');
    expect(job.message).toContain('PROMOÇÃO');
    expect(job.imageUrl).toMatch(/^https:\/\//);
    expect(job.affiliateUrl).toMatch(/^https:\/\//);
    expect(job.createdAt).toEqual(expect.any(String));
    expect(job.updatedAt).toBe(job.createdAt);
  });

  it('exposes only the documented public fields on the job', () => {
    const job = createShareJob(validShareJobInput());
    const keys = Object.keys(job).sort();

    expect(keys).toEqual(
      [
        'affiliateUrl',
        'attempts',
        'createdAt',
        'destinationId',
        'error',
        'id',
        'imageUrl',
        'maxAttempts',
        'message',
        'nextAttemptAt',
        'productId',
        'sentAt',
        'status',
        'updatedAt',
      ].sort(),
    );
  });
});

describe('ShareJob field validation', () => {
  it('rejects missing required fields', () => {
    expect(() => createShareJob({ ...validShareJobInput(), productId: '' })).toThrow(
      /productId/i,
    );
    expect(() => createShareJob({ ...validShareJobInput(), destinationId: '  ' })).toThrow(
      /destinationId/i,
    );
    expect(() => createShareJob({ ...validShareJobInput(), message: '' })).toThrow(/message/i);
    expect(() => createShareJob({ ...validShareJobInput(), imageUrl: 'not-a-url' })).toThrow(
      /imageUrl/i,
    );
    expect(() => createShareJob({ ...validShareJobInput(), affiliateUrl: 'ftp://x' })).toThrow(
      /affiliateUrl/i,
    );
  });

  it('rejects messages that leak commission language', () => {
    expect(() =>
      createShareJob({
        ...validShareJobInput(),
        message: 'Compre agora! Comissão 14% só hoje.',
      }),
    ).toThrow(/comiss/i);
  });

  it('rejects extra sensitive fields on the input object', () => {
    const dirty = {
      ...validShareJobInput(),
      commissionRate: 14,
      commissionAmount: 18.9,
      privateCommission: { percentage: 14, estimatedValue: 18.9 },
      shopeeSecret: 'super-secret',
      appId: '123456',
      accessToken: 'tok_abc',
    };

    expect(() => createShareJob(dirty)).toThrow(/sensitive|forbidden|comiss|secret|token|appId/i);
  });
});

describe('ShareJob status machine', () => {
  it('starts pending and only allows pending → processing', () => {
    const job = createShareJob(validShareJobInput());
    expect(SHARE_JOB_STATUSES).toEqual(['pending', 'processing', 'sent', 'failed']);
    expect(getLegalShareJobTransitions('pending')).toEqual(['processing']);

    const processing = transitionShareJob(job, 'processing');
    expect(processing.status).toBe('processing');
    expect(processing.updatedAt >= job.updatedAt).toBe(true);
  });

  it('allows processing → sent and records sentAt', () => {
    const processing = transitionShareJob(createShareJob(validShareJobInput()), 'processing');
    const sent = transitionShareJob(processing, 'sent');

    expect(sent.status).toBe('sent');
    expect(sent.sentAt).toEqual(expect.any(String));
    expect(sent.error).toBeNull();
  });

  it('allows processing → failed with an error', () => {
    const processing = transitionShareJob(createShareJob(validShareJobInput()), 'processing');
    const failed = transitionShareJob(processing, 'failed', { error: 'provider timeout' });

    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('provider timeout');
    expect(failed.sentAt).toBeNull();
  });

  it('rejects illegal transitions', () => {
    const pending = createShareJob(validShareJobInput());
    expect(() => transitionShareJob(pending, 'sent')).toThrow(/illegal transition/i);
    expect(() => transitionShareJob(pending, 'failed')).toThrow(/illegal transition/i);

    const sent = transitionShareJob(transitionShareJob(pending, 'processing'), 'sent');
    expect(() => transitionShareJob(sent, 'pending')).toThrow(/illegal transition/i);
    expect(() => transitionShareJob(sent, 'processing')).toThrow(/illegal transition/i);
  });
});
