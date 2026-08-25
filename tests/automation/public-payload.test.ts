import { describe, expect, it } from 'vitest';
import {
  assertNoSensitivePublicFields,
  createShareJob,
  createSharePayload,
  toPublicSharePayload,
} from '../../src/automation/index.ts';
import { validSharePayloadInput, validShareJobInput } from './fixtures.ts';

const COMMISSION_LEAKS = [
  'commission',
  'commissionRate',
  'commissionAmount',
  'privateCommission',
  'estimatedValue',
  'comissao',
  'comissão',
];

const SECRET_LEAKS = [
  'SHOPEE_SECRET',
  'shopeeSecret',
  'OPENAI_API_KEY',
  'openaiApiKey',
  'apiKey',
  'appId',
  'accessToken',
  'refreshToken',
  'token',
  'partnerKey',
];

describe('payload sem comissão', () => {
  it('nunca inclui campos de comissão', () => {
    const job = createShareJob(validShareJobInput());
    const publicPayload = toPublicSharePayload(job);
    const serialized = JSON.stringify(publicPayload).toLowerCase();

    for (const leak of COMMISSION_LEAKS) {
      expect(serialized).not.toContain(leak.toLowerCase());
    }

    expect(publicPayload).not.toHaveProperty('commissionRate');
    expect(publicPayload).not.toHaveProperty('commissionAmount');
    expect(publicPayload).not.toHaveProperty('privateCommission');
    expect(() => assertNoSensitivePublicFields(publicPayload)).not.toThrow();
  });

  it('rejeita commissionRate/commissionAmount no input', () => {
    expect(() =>
      createSharePayload({
        ...validSharePayloadInput(),
        commissionRate: 14,
      } as never),
    ).toThrow(/sensitive|forbidden|comiss/i);

    expect(() =>
      createSharePayload({
        ...validSharePayloadInput(),
        commissionAmount: 18.9,
      } as never),
    ).toThrow(/sensitive|forbidden|comiss/i);
  });

  it('rejeita copy que menciona comissão', () => {
    expect(() =>
      createSharePayload(
        validSharePayloadInput({
          generatedCopy: 'Compre agora! Comissão de 14% só hoje.',
        }),
      ),
    ).toThrow(/comiss/i);

    expect(() =>
      createSharePayload(
        validSharePayloadInput({
          generatedCopy: 'Great commission on this one',
        }),
      ),
    ).toThrow(/commission|sens/i);
  });
});

describe('payload sem secrets', () => {
  it('nunca inclui secrets, app ids ou tokens', () => {
    const job = createShareJob(validShareJobInput());
    const publicPayload = toPublicSharePayload(job);
    const keys = Object.keys(publicPayload);

    for (const forbidden of SECRET_LEAKS) {
      expect(keys).not.toContain(forbidden);
    }

    expect(JSON.stringify(publicPayload)).not.toMatch(
      /shopee_secret|openai_api_key|accessToken|partnerKey/i,
    );
  });

  it('rejeita SHOPEE_SECRET / OPENAI_API_KEY no input', () => {
    expect(() =>
      createSharePayload({
        ...validSharePayloadInput(),
        SHOPEE_SECRET: 'super-secret',
      } as never),
    ).toThrow(/sensitive|forbidden|secret/i);

    expect(() =>
      createSharePayload({
        ...validSharePayloadInput(),
        OPENAI_API_KEY: 'sk-abc123',
      } as never),
    ).toThrow(/sensitive|forbidden|openai|api/i);

    expect(() =>
      createSharePayload({
        ...validSharePayloadInput(),
        accessToken: 'tok_abc',
      } as never),
    ).toThrow(/sensitive|forbidden|token/i);
  });

  it('rejeita copy que vaza chave de API', () => {
    expect(() =>
      createSharePayload(
        validSharePayloadInput({
          generatedCopy: 'Use a chave sk-abcdef0123456789abcdef para testar',
        }),
      ),
    ).toThrow(/sensitive|secret|forbidden/i);
  });

  it('detecta campo sensível aninhado no sanitizador', () => {
    const dirty = {
      productId: 'prod-001',
      title: 'Oferta',
      nested: {
        privateCommission: { percentage: 20, estimatedValue: 10 },
        shopeeSecret: 'abc',
      },
    };

    expect(() => assertNoSensitivePublicFields(dirty)).toThrow(
      /sensitive|forbidden/i,
    );
  });
});
