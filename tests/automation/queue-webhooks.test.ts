import { describe, expect, it } from 'vitest';
import {
  REAL_DISPATCH_ENABLED,
  createAutomationRuntime,
  createShareDestination,
  createShareJob,
} from '../../src/automation/index.ts';
import { validShareJobInput } from './fixtures.ts';

describe('in-memory send queue (no real dispatch)', () => {
  it('keeps REAL_DISPATCH_ENABLED off in etapa 1', () => {
    expect(REAL_DISPATCH_ENABLED).toBe(false);
  });

  it('enqueues a job and records history + webhook without sending', () => {
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
    expect(runtime.webhooks.list().map((event) => event.type)).toContain('share.job.created');
    expect(runtime.webhooks.list().every((event) => event.deliveryStatus === 'recorded')).toBe(
      true,
    );
  });

  it('processes the queue with the noop dispatcher: retries then fails, never sends', async () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    let now = t0;
    const runtime = createAutomationRuntime({
      now: () => now,
    });
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

  it('does not dequeue a job whose nextAttemptAt is still in the future', async () => {
    const t0 = new Date('2026-08-25T18:00:00.000Z');
    let now = t0;
    const runtime = createAutomationRuntime({ now: () => now });
    runtime.enqueue(createShareJob(validShareJobInput(), { now: () => now }));

    await runtime.processNext();
    expect(runtime.getJob(runtime.queue.snapshot()[0].id)?.nextAttemptAt).toBe(
      '2026-08-25T18:00:01.000Z',
    );

    const skipped = await runtime.processNext();
    expect(skipped.skipped).toBe(true);
    expect(skipped.reason).toMatch(/nextAttemptAt|not due/i);
  });

  it('can simulate a successful send without enabling real dispatch', async () => {
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
    expect(runtime.webhooks.list().some((event) => event.type === 'share.job.sent')).toBe(true);
  });
});

describe('future integrations stay disabled', () => {
  it('exposes WhatsApp and MCP/Jarvis as inactive contracts', () => {
    const runtime = createAutomationRuntime();
    expect(runtime.integrations.whatsapp.enabled).toBe(false);
    expect(runtime.integrations.mcp.enabled).toBe(false);
    expect(runtime.integrations.jarvis.enabled).toBe(false);
    expect(() => runtime.integrations.whatsapp.connect()).toThrow(/not enabled|etapa 1/i);
    expect(() => runtime.integrations.mcp.connect()).toThrow(/not enabled|etapa 1/i);
  });
});
