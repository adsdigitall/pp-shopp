import { describe, expect, it } from 'vitest';
import {
  REAL_DISPATCH_ENABLED,
  createAutomationRuntime,
  createShareDestination,
  createShareJob,
} from '../../src/automation/index.ts';
import { storySharePayload, validShareJobInput } from './fixtures.ts';

describe('fila em memória (sem envio real)', () => {
  it('mantém REAL_DISPATCH_ENABLED desligado', () => {
    expect(REAL_DISPATCH_ENABLED).toBe(false);
  });

  it('enfileira job e registra histórico + webhook sem enviar', () => {
    const runtime = createAutomationRuntime();
    const destination = createShareDestination({
      name: 'Grupo Ofertas',
      channel: 'whatsapp_group',
      externalRef: 'grupo-ofertas',
    });
    const job = createShareJob({
      ...validShareJobInput(),
      destinationId: destination.id,
    });

    runtime.destinations.save(destination);
    runtime.enqueue(job);

    expect(runtime.queue.snapshot().map((item) => item.id)).toEqual([job.id]);
    expect(runtime.webhooks.list().map((event) => event.type)).toContain(
      'share.job.created',
    );
    expect(
      runtime.webhooks.list().every((event) => event.deliveryStatus === 'recorded'),
    ).toBe(true);
  });

  it('processa a fila com noop: tenta 3x, falha, nunca envia', async () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    let now = t0;
    const runtime = createAutomationRuntime({ now: () => now });
    const job = createShareJob(validShareJobInput(), { now: () => now });
    runtime.enqueue(job);

    const first = await runtime.processNext();
    expect(first.ok).toBe(false);
    expect(first.dryRun).toBe(true);
    expect(first.realDispatch).toBe(false);
    expect(runtime.getJob(job.id)?.status).toBe('pending');
    expect(runtime.getJob(job.id)?.attempts).toBe(1);

    now = new Date('2026-08-25T18:00:01.000Z');
    const second = await runtime.processNext();
    expect(second.ok).toBe(false);
    expect(runtime.getJob(job.id)?.attempts).toBe(2);

    now = new Date('2026-08-25T18:00:06.000Z');
    const third = await runtime.processNext();
    expect(third.ok).toBe(false);
    expect(runtime.getJob(job.id)?.status).toBe('failed');
    expect(runtime.getJob(job.id)?.attempts).toBe(3);

    const history = runtime.history.list();
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((entry) => entry.dryRun === true)).toBe(true);
    expect(history.every((entry) => entry.realDispatch === false)).toBe(true);
    expect(runtime.dispatcher.realDispatchEnabled).toBe(false);
    expect(runtime.dispatcher.name).toBe('noop');
  });

  it('não processa job cujo nextAttemptAt ainda está no futuro', async () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    const now = t0;
    const runtime = createAutomationRuntime({ now: () => now });
    const job = createShareJob(validShareJobInput(), { now: () => now });
    runtime.enqueue(job);

    await runtime.processNext();
    expect(runtime.getJob(job.id)?.nextAttemptAt).toBe('2026-08-25T18:00:01.000Z');

    const skipped = await runtime.processNext();
    expect(skipped.skipped).toBe(true);
    expect(skipped.reason).toMatch(/nextAttemptAt|not due/i);
  });

  it('simula envio bem-sucedido sem habilitar dispatch real', async () => {
    const runtime = createAutomationRuntime({ dispatcher: 'simulated-success' });
    const job = createShareJob(validShareJobInput());
    runtime.enqueue(job);

    const result = await runtime.processNext();
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.realDispatch).toBe(false);
    expect(runtime.getJob(job.id)?.status).toBe('sent');
    expect(runtime.getJob(job.id)?.sentAt).toEqual(expect.any(String));
    expect(runtime.history.list()[0]?.success).toBe(true);
    expect(
      runtime.webhooks.list().some((event) => event.type === 'share.job.sent'),
    ).toBe(true);
  });

  it('passa pelo status ready antes de sent', async () => {
    const runtime = createAutomationRuntime({ dispatcher: 'simulated-success' });
    runtime.enqueue(createShareJob(validShareJobInput()));

    await runtime.processNext();
    expect(
      runtime.webhooks.list().some((event) => event.type === 'share.job.ready'),
    ).toBe(true);
  });
});

describe('ShareHistory', () => {
  it('registra produto, destino, formato, data/hora, status, erro e tentativas', async () => {
    const runtime = createAutomationRuntime({ dispatcher: 'simulated-success' });
    const job = createShareJob({
      destinationId: 'dest-status',
      payload: storySharePayload(),
    });
    runtime.enqueue(job);
    await runtime.processNext();

    const entry = runtime.history.list()[0];
    expect(entry).toBeDefined();
    expect(entry.productId).toBe('prod-001');
    expect(entry.destinationId).toBe('dest-status');
    expect(entry.format).toBe('story');
    expect(entry.recordedAt).toEqual(expect.any(String));
    expect(entry.status).toBe('sent');
    expect(entry.error).toBeNull();
    expect(entry.attempts).toBe(1);
    expect(entry.dryRun).toBe(true);
    expect(entry.realDispatch).toBe(false);
  });

  it('registra erro quando o job falha', async () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    const runtime = createAutomationRuntime({ now: () => t0 });
    const job = createShareJob(validShareJobInput(), { now: () => t0 });
    runtime.enqueue(job);

    await runtime.processNext();

    const entry = runtime.history.byJob(job.id)[0];
    expect(entry.success).toBe(false);
    expect(entry.error).toMatch(/real dispatch disabled|dispatch failed/i);
    expect(entry.attempts).toBe(1);
  });

  it('webhooks só carregam payload público (sem comissão/secret)', () => {
    const runtime = createAutomationRuntime();
    runtime.enqueue(createShareJob(validShareJobInput()));

    const serialized = JSON.stringify(runtime.webhooks.list()).toLowerCase();
    expect(serialized).not.toContain('commission');
    expect(serialized).not.toContain('comiss');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('accesstoken');
  });
});

describe('integrações futuras permanecem desligadas', () => {
  it('expõe WhatsApp e MCP/Jarvis como contratos inativos', () => {
    const runtime = createAutomationRuntime();
    expect(runtime.integrations.whatsapp.enabled).toBe(false);
    expect(runtime.integrations.mcp.enabled).toBe(false);
    expect(runtime.integrations.jarvis.enabled).toBe(false);
    expect(() => runtime.integrations.whatsapp.connect()).toThrow(
      /not enabled|etapa 1/i,
    );
    expect(() => runtime.integrations.mcp.connect()).toThrow(/not enabled|etapa 1/i);
    expect(() => runtime.integrations.jarvis.connect()).toThrow(/not enabled|etapa 1/i);
  });
});
