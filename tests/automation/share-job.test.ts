import { describe, expect, it } from 'vitest';
import {
  createShareJob,
  createSharePayload,
  getLegalShareJobTransitions,
  SHARE_JOB_STATUSES,
  transitionShareJob,
} from '../../src/automation/index.ts';
import { validSharePayloadInput, validShareJobInput } from './fixtures.ts';

describe('SharePayload creation', () => {
  it('cria payload com os campos públicos documentados', () => {
    const payload = createSharePayload(validSharePayloadInput());

    expect(payload.productId).toBe('prod-001');
    expect(payload.title).toBe('Fone TWS com display LED');
    expect(payload.generatedCopy).toContain('PROMOÇÃO');
    expect(payload.affiliateUrl).toMatch(/^https:\/\//);
    expect(payload.generatedImageUrl).toMatch(/^https:\/\//);
    expect(payload.currentPrice).toBe(39.9);
    expect(payload.originalPrice).toBe(99.9);
    expect(payload.discountPercentage).toBe(60);
    expect(payload.shippingHighlight).toBe('Frete Grátis');
    expect(payload.targetFormat).toBe('group_message');
    expect(payload.cta).toBe('Compre agora');
  });

  it('expõe exatamente a whitelist de chaves públicas', () => {
    const payload = createSharePayload(validSharePayloadInput());

    expect(Object.keys(payload).sort()).toEqual(
      [
        'affiliateUrl',
        'cta',
        'currentPrice',
        'discountPercentage',
        'generatedCopy',
        'generatedImageUrl',
        'originalPrice',
        'productId',
        'shippingHighlight',
        'targetFormat',
        'title',
      ].sort(),
    );
  });

  it('aceita campos opcionais ausentes como null', () => {
    const payload = createSharePayload({
      productId: 'p1',
      title: 'Produto simples',
      generatedCopy: 'Confira essa oferta',
      affiliateUrl: 'https://s.shopee.com.br/x',
      targetFormat: 'group_message',
    });

    expect(payload.generatedImageUrl).toBeNull();
    expect(payload.currentPrice).toBeNull();
    expect(payload.originalPrice).toBeNull();
    expect(payload.discountPercentage).toBeNull();
    expect(payload.shippingHighlight).toBeNull();
    expect(payload.cta).toBeNull();
  });

  it('rejeita campos obrigatórios ausentes ou URL inválida', () => {
    expect(() =>
      createSharePayload(validSharePayloadInput({ productId: '' })),
    ).toThrow(/productId/i);
    expect(() => createSharePayload(validSharePayloadInput({ title: '  ' }))).toThrow(
      /title/i,
    );
    expect(() =>
      createSharePayload(validSharePayloadInput({ generatedCopy: '' })),
    ).toThrow(/generatedCopy/i);
    expect(() =>
      createSharePayload(validSharePayloadInput({ affiliateUrl: 'ftp://x' })),
    ).toThrow(/affiliateUrl/i);
  });

  it('rejeita targetFormat fora de group_message | story', () => {
    expect(() =>
      createSharePayload(
        validSharePayloadInput({
          targetFormat: 'email' as unknown as 'story',
        }),
      ),
    ).toThrow(/targetFormat/i);
  });
});

describe('ShareJob creation', () => {
  it('cria job pending com 0 tentativas', () => {
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
    expect(job.format).toBe('group_message');
    expect(job.createdAt).toEqual(expect.any(String));
    expect(job.updatedAt).toBe(job.createdAt);
  });

  it('deriva productId e format do payload', () => {
    const job = createShareJob(validShareJobInput());
    expect(job.productId).toBe(job.payload.productId);
    expect(job.format).toBe(job.payload.targetFormat);
  });

  it('rejeita destinationId ausente', () => {
    expect(() =>
      createShareJob({ ...validShareJobInput(), destinationId: '  ' }),
    ).toThrow(/destinationId/i);
  });
});

describe('ShareJob status machine', () => {
  it('lista os 5 status oficiais', () => {
    expect(SHARE_JOB_STATUSES).toEqual([
      'pending',
      'processing',
      'ready',
      'sent',
      'failed',
    ]);
  });

  it('pending só permite processing', () => {
    const job = createShareJob(validShareJobInput());
    expect(getLegalShareJobTransitions('pending')).toEqual(['processing']);

    const processing = transitionShareJob(job, 'processing');
    expect(processing.status).toBe('processing');
    expect(processing.updatedAt >= job.updatedAt).toBe(true);
  });

  it('processing → ready → sent registra sentAt', () => {
    const processing = transitionShareJob(
      createShareJob(validShareJobInput()),
      'processing',
    );
    const ready = transitionShareJob(processing, 'ready');
    expect(ready.status).toBe('ready');

    const sent = transitionShareJob(ready, 'sent');
    expect(sent.status).toBe('sent');
    expect(sent.sentAt).toEqual(expect.any(String));
    expect(sent.error).toBeNull();
  });

  it('processing → failed guarda o erro', () => {
    const processing = transitionShareJob(
      createShareJob(validShareJobInput()),
      'processing',
    );
    const failed = transitionShareJob(processing, 'failed', {
      error: 'provider timeout',
    });

    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('provider timeout');
    expect(failed.sentAt).toBeNull();
  });

  it('rejeita transições ilegais', () => {
    const pending = createShareJob(validShareJobInput());
    expect(() => transitionShareJob(pending, 'sent')).toThrow(/illegal transition/i);
    expect(() => transitionShareJob(pending, 'ready')).toThrow(/illegal transition/i);

    const sent = transitionShareJob(
      transitionShareJob(transitionShareJob(pending, 'processing'), 'ready'),
      'sent',
    );
    expect(() => transitionShareJob(sent, 'pending')).toThrow(/illegal transition/i);
    expect(() => transitionShareJob(sent, 'processing')).toThrow(/illegal transition/i);
  });
});
