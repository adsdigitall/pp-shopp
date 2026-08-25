import { describe, expect, it } from 'vitest';
import {
  assertNoSensitivePublicFields,
  createShareJob,
  toPublicSharePayload,
} from '../../src/automation/index.ts';
import { validShareJobInput } from './fixtures.ts';

const COMMISSION_LEAKS = [
  'commission',
  'commissionRate',
  'commissionAmount',
  'privateCommission',
  'estimatedValue',
  'comissao',
  'comissão',
];

describe('public ShareJob payload', () => {
  it('never includes commission fields', () => {
    const job = createShareJob(validShareJobInput());
    const publicPayload = toPublicSharePayload(job);
    const serialized = JSON.stringify(publicPayload);

    for (const leak of COMMISSION_LEAKS) {
      expect(serialized.toLowerCase()).not.toContain(leak.toLowerCase());
    }

    expect(publicPayload).not.toHaveProperty('commissionRate');
    expect(publicPayload).not.toHaveProperty('commissionAmount');
    expect(publicPayload).not.toHaveProperty('privateCommission');
    expect(() => assertNoSensitivePublicFields(publicPayload)).not.toThrow();
  });

  it('never includes secrets, app ids or private tokens', () => {
    const job = createShareJob(validShareJobInput());
    const publicPayload = toPublicSharePayload(job);
    const keys = Object.keys(publicPayload);

    for (const forbidden of [
      'secret',
      'shopeeSecret',
      'appId',
      'app_id',
      'accessToken',
      'refreshToken',
      'token',
      'apiKey',
      'partnerKey',
    ]) {
      expect(keys).not.toContain(forbidden);
    }

    expect(JSON.stringify(publicPayload)).not.toMatch(/shopeeSecret|accessToken|partnerKey/i);
  });

  it('carries only shareable offer fields', () => {
    const job = createShareJob(validShareJobInput());
    const publicPayload = toPublicSharePayload(job);

    expect(publicPayload).toEqual({
      jobId: job.id,
      productId: job.productId,
      destinationId: job.destinationId,
      message: job.message,
      imageUrl: job.imageUrl,
      affiliateUrl: job.affiliateUrl,
      status: job.status,
      attempts: job.attempts,
    });
  });

  it('strips nested commission if a dirty object is passed through the sanitizer', () => {
    const dirty = {
      jobId: 'share_x',
      productId: 'prod-001',
      message: 'Oferta relâmpago',
      imageUrl: 'https://cdn.example/p.png',
      affiliateUrl: 'https://s.shopee.com.br/aff_x',
      nested: {
        privateCommission: { percentage: 20, estimatedValue: 10 },
        shopeeSecret: 'abc',
      },
    };

    expect(() => assertNoSensitivePublicFields(dirty)).toThrow(/sensitive|forbidden/i);
  });
});
