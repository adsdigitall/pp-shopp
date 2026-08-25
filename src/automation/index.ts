/**
 * Share automation — etapa 1 (arquitetura e contratos).
 *
 * TRAVA DURA: nada aqui envia mensagem de verdade. `REAL_DISPATCH_ENABLED`
 * é `false` e os dispatchers são simulados (dryRun). A integração real com
 * WhatsApp / MCP / Jarvis fica para uma etapa futura.
 *
 * PRIVACIDADE: o SharePayload é uma whitelist fechada. Comissão
 * (commissionRate / commissionAmount), SHOPEE_SECRET, OPENAI_API_KEY e
 * tokens internos são rejeitados na criação e no sanitizador.
 */

import {
  COMMISSION_MESSAGE_PATTERNS,
  FORBIDDEN_INPUT_KEYS,
  REAL_DISPATCH_ENABLED,
  RETRY_POLICY,
  SECRET_VALUE_PATTERNS,
  SENSITIVE_PUBLIC_KEYS,
} from './constants';
import {
  SHARE_FORMATS,
  SHARE_JOB_STATUSES,
  SHARE_PAYLOAD_KEYS,
  type AutomationJobKind,
  type Clock,
  type CreateShareDestinationInput,
  type CreateShareJobInput,
  type CreateSharePayloadInput,
  type DispatchAttemptResult,
  type FutureIntegration,
  type ProcessNextResult,
  type ShareDestination,
  type ShareDispatcher,
  type ShareFormat,
  type ShareHistoryEntry,
  type ShareJob,
  type ShareJobStatus,
  type SharePayload,
  type ShareResult,
  type WebhookEvent,
  type WebhookEventType,
} from './types';

export * from './types';
export {
  COMMISSION_MESSAGE_PATTERNS,
  FORBIDDEN_INPUT_KEYS,
  REAL_DISPATCH_ENABLED,
  RETRY_POLICY,
  SECRET_VALUE_PATTERNS,
  SENSITIVE_PUBLIC_KEYS,
} from './constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const systemClock: Clock = { now: () => new Date() };

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${rand}`;
}

function iso(clock: Clock): string {
  return clock.now().toISOString();
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Campo obrigatório ausente ou vazio: ${field}`);
  }
  return value.trim();
}

function requireHttpUrl(value: unknown, field: string): string {
  const text = requireText(value, field);
  if (!/^https?:\/\//i.test(text)) {
    throw new Error(`Campo ${field} deve ser uma URL http(s) válida.`);
  }
  return text;
}

function optionalHttpUrl(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requireHttpUrl(value, field);
}

function optionalNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Campo ${field} deve ser número finito ou null.`);
  }
  return value;
}

function optionalText(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new Error(`Campo ${field} deve ser string ou null.`);
  }
  return value.trim();
}

// ---------------------------------------------------------------------------
// Sanitizador de privacidade
// ---------------------------------------------------------------------------

/** Detecta chave sensível por substring, case-insensitive. */
function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[\s_-]/g, '');
  return SENSITIVE_PUBLIC_KEYS.some((forbidden) =>
    normalized.includes(forbidden.toLowerCase().replace(/[\s_-]/g, '')),
  );
}

/**
 * Falha se o objeto (em qualquer profundidade) tiver campo sensível
 * ou texto com comissão/secret. Use antes de expor qualquer payload.
 */
export function assertNoSensitivePublicFields(
  value: unknown,
  path = 'payload',
): void {
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    for (const pattern of COMMISSION_MESSAGE_PATTERNS) {
      if (pattern.test(value)) {
        throw new Error(
          `Conteúdo sensível (comissão) detectado em ${path}: forbidden content.`,
        );
      }
    }
    for (const pattern of SECRET_VALUE_PATTERNS) {
      if (pattern.test(value)) {
        throw new Error(
          `Conteúdo sensível (secret/token) detectado em ${path}: forbidden content.`,
        );
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSensitivePublicFields(item, `${path}[${index}]`),
    );
    return;
  }

  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        throw new Error(
          `Campo sensível proibido em ${path}.${key}: forbidden / sensitive field.`,
        );
      }
      assertNoSensitivePublicFields(child, `${path}.${key}`);
    }
  }
}

/** Rejeita chaves proibidas passadas no input de criação. */
function assertNoForbiddenInputKeys(input: object): void {
  for (const key of Object.keys(input)) {
    if (
      FORBIDDEN_INPUT_KEYS.some((k) => k.toLowerCase() === key.toLowerCase()) ||
      isSensitiveKey(key)
    ) {
      throw new Error(
        `Campo sensível proibido no input: ${key} (forbidden / sensitive field).`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// SharePayload
// ---------------------------------------------------------------------------

export function isShareFormat(value: unknown): value is ShareFormat {
  return typeof value === 'string' && (SHARE_FORMATS as readonly string[]).includes(value);
}

/**
 * Cria o payload público da oferta. Whitelist fechada:
 * só os campos documentados entram no objeto final.
 */
export function createSharePayload(input: CreateSharePayloadInput): SharePayload {
  assertNoForbiddenInputKeys(input);

  if (!isShareFormat(input.targetFormat)) {
    throw new Error(
      `targetFormat inválido. Use um de: ${SHARE_FORMATS.join(', ')}.`,
    );
  }

  const payload: SharePayload = {
    productId: requireText(input.productId, 'productId'),
    title: requireText(input.title, 'title'),
    generatedCopy: requireText(input.generatedCopy, 'generatedCopy'),
    affiliateUrl: requireHttpUrl(input.affiliateUrl, 'affiliateUrl'),
    generatedImageUrl: optionalHttpUrl(input.generatedImageUrl, 'generatedImageUrl'),
    currentPrice: optionalNumber(input.currentPrice, 'currentPrice'),
    originalPrice: optionalNumber(input.originalPrice, 'originalPrice'),
    discountPercentage: optionalNumber(input.discountPercentage, 'discountPercentage'),
    shippingHighlight: optionalText(input.shippingHighlight, 'shippingHighlight'),
    targetFormat: input.targetFormat,
    cta: optionalText(input.cta, 'cta'),
  };

  // Barreira final: copy não pode citar comissão nem vazar secret.
  assertNoSensitivePublicFields(payload, 'sharePayload');

  return payload;
}

/** Reforça a whitelist: devolve apenas as chaves públicas documentadas. */
export function toPublicSharePayload(job: ShareJob): SharePayload {
  const source = job.payload;
  const out = {} as Record<string, unknown>;
  for (const key of SHARE_PAYLOAD_KEYS) {
    out[key] = source[key];
  }
  const payload = out as unknown as SharePayload;
  assertNoSensitivePublicFields(payload, 'publicSharePayload');
  return payload;
}

// ---------------------------------------------------------------------------
// ShareDestination
// ---------------------------------------------------------------------------

const DEFAULT_FORMATS_BY_CHANNEL: Record<string, readonly ShareFormat[]> = {
  whatsapp_group: ['group_message'],
  whatsapp_broadcast: ['group_message'],
  whatsapp_status: ['story'],
  telegram: ['group_message'],
  webhook: ['group_message', 'story'],
  mcp: ['group_message', 'story'],
  manual_copy: ['group_message', 'story'],
};

export function createShareDestination(
  input: CreateShareDestinationInput,
  clock: Clock = systemClock,
): ShareDestination {
  assertNoForbiddenInputKeys(input);

  return {
    id: nextId('dest'),
    name: requireText(input.name, 'name'),
    channel: input.channel,
    externalRef: requireText(input.externalRef, 'externalRef'),
    supportedFormats:
      input.supportedFormats ?? DEFAULT_FORMATS_BY_CHANNEL[input.channel] ?? ['group_message'],
    enabled: true,
    createdAt: iso(clock),
  };
}

// ---------------------------------------------------------------------------
// ShareJob + máquina de status
// ---------------------------------------------------------------------------

/**
 * Transições legais.
 * pending -> processing        (worker pegou o job)
 * processing -> ready          (conteúdo pronto, aguardando envio)
 * processing -> pending        (falhou, retry agendado)
 * processing -> failed         (esgotou tentativas)
 * ready -> sent                (envio confirmado — etapa futura)
 * ready -> failed
 */
const LEGAL_TRANSITIONS: Record<ShareJobStatus, readonly ShareJobStatus[]> = {
  pending: ['processing'],
  processing: ['ready', 'sent', 'pending', 'failed'],
  ready: ['sent', 'failed'],
  sent: [],
  failed: [],
};

export function getLegalShareJobTransitions(
  status: ShareJobStatus,
): readonly ShareJobStatus[] {
  return LEGAL_TRANSITIONS[status] ?? [];
}

export function createShareJob(
  input: CreateShareJobInput,
  clock: Clock = systemClock,
): ShareJob {
  assertNoForbiddenInputKeys(input);

  const destinationId = requireText(input.destinationId, 'destinationId');
  if (!input.payload || typeof input.payload !== 'object') {
    throw new Error('Campo obrigatório ausente: payload (SharePayload).');
  }

  // Revalida o payload (aceita objeto cru vindo de fora).
  const payload = createSharePayload(input.payload as CreateSharePayloadInput);
  const timestamp = iso(clock);

  return {
    id: nextId('share'),
    productId: payload.productId,
    destinationId,
    format: payload.targetFormat,
    payload,
    status: 'pending',
    attempts: 0,
    maxAttempts: RETRY_POLICY.maxAttempts,
    createdAt: timestamp,
    updatedAt: timestamp,
    sentAt: null,
    nextAttemptAt: null,
    error: null,
  };
}

export function transitionShareJob(
  job: ShareJob,
  next: ShareJobStatus,
  options: { error?: string; clock?: Clock } = {},
): ShareJob {
  const clock = options.clock ?? systemClock;

  if (!(SHARE_JOB_STATUSES as readonly string[]).includes(next)) {
    throw new Error(`Status desconhecido: ${next}`);
  }
  if (!getLegalShareJobTransitions(job.status).includes(next)) {
    throw new Error(
      `Illegal transition: ${job.status} -> ${next}. Permitido: ${
        getLegalShareJobTransitions(job.status).join(', ') || '(nenhum)'
      }.`,
    );
  }

  const timestamp = iso(clock);

  return {
    ...job,
    status: next,
    updatedAt: timestamp,
    sentAt: next === 'sent' ? timestamp : job.sentAt,
    error: next === 'failed' ? options.error ?? job.error ?? 'unknown error' : null,
    nextAttemptAt: next === 'sent' || next === 'failed' ? null : job.nextAttemptAt,
  };
}

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

/**
 * Registra falha de uma tentativa.
 * Tentativas 1 e 2 voltam para `pending` com espera (backoff).
 * Tentativa 3 marca `failed` definitivamente. NÃO dispara nada.
 */
export function applyShareJobFailure(
  job: ShareJob,
  error: string,
  options: { clock?: Clock } = {},
): ShareJob {
  const clock = options.clock ?? systemClock;

  if (job.status !== 'processing') {
    throw new Error(
      `Retry só se aplica a job em processing (status atual: ${job.status}).`,
    );
  }

  const attempts = job.attempts + 1;
  const timestamp = iso(clock);

  if (attempts >= job.maxAttempts) {
    return {
      ...job,
      attempts,
      status: 'failed',
      error,
      updatedAt: timestamp,
      nextAttemptAt: null,
      sentAt: null,
    };
  }

  const waitMs = RETRY_POLICY.backoffMsAfterAttempt[attempts - 1] ?? 0;

  return {
    ...job,
    attempts,
    status: 'pending',
    error,
    updatedAt: timestamp,
    nextAttemptAt: new Date(clock.now().getTime() + waitMs).toISOString(),
    sentAt: null,
  };
}

export function isShareJobDue(job: ShareJob, clock: Clock = systemClock): boolean {
  if (!job.nextAttemptAt) return true;
  return clock.now().getTime() >= new Date(job.nextAttemptAt).getTime();
}

// ---------------------------------------------------------------------------
// ShareResult / ShareHistory
// ---------------------------------------------------------------------------

export function buildShareResult(
  job: ShareJob,
  success: boolean,
  clock: Clock = systemClock,
): ShareResult {
  return {
    jobId: job.id,
    destinationId: job.destinationId,
    productId: job.productId,
    format: job.format,
    success,
    dryRun: true,
    realDispatch: false,
    attempts: job.attempts,
    status: job.status,
    error: job.error,
    recordedAt: iso(clock),
  };
}

export function createShareHistory(clock: Clock = systemClock) {
  const entries: ShareHistoryEntry[] = [];

  return {
    record(job: ShareJob, success: boolean): ShareHistoryEntry {
      const entry: ShareHistoryEntry = {
        id: nextId('hist'),
        jobId: job.id,
        productId: job.productId,
        destinationId: job.destinationId,
        format: job.format,
        status: job.status,
        attempts: job.attempts,
        success,
        dryRun: true,
        realDispatch: false,
        error: job.error,
        recordedAt: iso(clock),
      };
      entries.push(entry);
      return entry;
    },
    list(): readonly ShareHistoryEntry[] {
      return [...entries];
    },
    byJob(jobId: string): readonly ShareHistoryEntry[] {
      return entries.filter((entry) => entry.jobId === jobId);
    },
    clear(): void {
      entries.length = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// Dispatchers simulados (SEM envio real)
// ---------------------------------------------------------------------------

/** Dispatcher padrão: nunca envia, sempre falha (força o caminho de retry). */
export const noopDispatcher: ShareDispatcher = {
  name: 'noop',
  realDispatchEnabled: false,
  async dispatch(): Promise<DispatchAttemptResult> {
    return {
      ok: false,
      dryRun: true,
      realDispatch: false,
      error: 'real dispatch disabled (etapa 1: no real send)',
    };
  },
};

/** Dispatcher de teste: simula sucesso, mas continua sem enviar nada. */
export const simulatedSuccessDispatcher: ShareDispatcher = {
  name: 'simulated-success',
  realDispatchEnabled: false,
  async dispatch(): Promise<DispatchAttemptResult> {
    return { ok: true, dryRun: true, realDispatch: false };
  },
};

// ---------------------------------------------------------------------------
// Integrações futuras (desligadas)
// ---------------------------------------------------------------------------

function disabledIntegration(name: FutureIntegration['name']): FutureIntegration {
  return {
    name,
    enabled: false,
    connect: () => {
      throw new Error(
        `Integração ${name} not enabled — etapa 1 não faz envio real.`,
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Runtime em memória
// ---------------------------------------------------------------------------

export interface AutomationRuntimeOptions {
  clock?: Clock;
  now?: () => Date;
  dispatcher?: 'noop' | 'simulated-success' | ShareDispatcher;
}

export function createAutomationRuntime(options: AutomationRuntimeOptions = {}) {
  const clock: Clock = options.clock ?? (options.now ? { now: options.now } : systemClock);

  const dispatcher: ShareDispatcher =
    typeof options.dispatcher === 'object'
      ? options.dispatcher
      : options.dispatcher === 'simulated-success'
        ? simulatedSuccessDispatcher
        : noopDispatcher;

  const jobs = new Map<string, ShareJob>();
  const order: string[] = [];
  const destinationStore = new Map<string, ShareDestination>();
  const webhookEvents: WebhookEvent[] = [];
  const history = createShareHistory(clock);

  function emit(type: WebhookEventType, job: ShareJob): void {
    webhookEvents.push({
      id: nextId('evt'),
      type,
      jobId: job.id,
      payload: toPublicSharePayload(job),
      createdAt: iso(clock),
      deliveryStatus: 'recorded',
    });
  }

  function save(job: ShareJob): ShareJob {
    jobs.set(job.id, job);
    return job;
  }

  return {
    dispatcher,
    realDispatchEnabled: REAL_DISPATCH_ENABLED,

    destinations: {
      save(destination: ShareDestination): ShareDestination {
        destinationStore.set(destination.id, destination);
        return destination;
      },
      get(id: string): ShareDestination | undefined {
        return destinationStore.get(id);
      },
      list(): readonly ShareDestination[] {
        return [...destinationStore.values()];
      },
    },

    enqueue(job: ShareJob): ShareJob {
      save(job);
      if (!order.includes(job.id)) order.push(job.id);
      emit('share.job.created', job);
      emit('share.job.queued', job);
      return job;
    },

    getJob(id: string): ShareJob | undefined {
      return jobs.get(id);
    },

    queue: {
      snapshot(): readonly ShareJob[] {
        return order
          .map((id) => jobs.get(id))
          .filter((job): job is ShareJob => Boolean(job))
          .filter((job) => job.status === 'pending' || job.status === 'processing');
      },
      size(): number {
        return this.snapshot().length;
      },
    },

    history,

    webhooks: {
      list(): readonly WebhookEvent[] {
        return [...webhookEvents];
      },
      byType(type: WebhookEventType): readonly WebhookEvent[] {
        return webhookEvents.filter((event) => event.type === type);
      },
    },

    integrations: {
      whatsapp: disabledIntegration('whatsapp'),
      mcp: disabledIntegration('mcp'),
      jarvis: disabledIntegration('jarvis'),
    },

    /**
     * Processa o próximo job elegível. NUNCA envia de verdade:
     * apenas consulta o dispatcher simulado e aplica a máquina de status.
     */
    async processNext(): Promise<ProcessNextResult> {
      const candidate = order
        .map((id) => jobs.get(id))
        .find((job): job is ShareJob => Boolean(job) && job!.status === 'pending');

      if (!candidate) {
        return {
          ok: false,
          dryRun: true,
          realDispatch: false,
          skipped: true,
          reason: 'queue empty: no pending job',
        };
      }

      if (!isShareJobDue(candidate, clock)) {
        return {
          ok: false,
          dryRun: true,
          realDispatch: false,
          skipped: true,
          jobId: candidate.id,
          reason: `not due yet: nextAttemptAt=${candidate.nextAttemptAt}`,
        };
      }

      const processing = save(transitionShareJob(candidate, 'processing', { clock }));
      emit('share.job.processing', processing);

      const attempt = await dispatcher.dispatch(processing);

      if (attempt.ok) {
        const ready = save(transitionShareJob(processing, 'ready', { clock }));
        emit('share.job.ready', ready);

        const sent = save({
          ...transitionShareJob(ready, 'sent', { clock }),
          attempts: processing.attempts + 1,
        });
        emit('share.job.sent', sent);
        history.record(sent, true);

        return { ok: true, dryRun: true, realDispatch: false, jobId: sent.id };
      }

      const failed = save(
        applyShareJobFailure(processing, attempt.error ?? 'dispatch failed', { clock }),
      );
      history.record(failed, false);
      emit(
        failed.status === 'failed' ? 'share.job.failed' : 'share.job.retry_scheduled',
        failed,
      );

      return {
        ok: false,
        dryRun: true,
        realDispatch: false,
        jobId: failed.id,
        error: failed.error ?? undefined,
      };
    },
  };
}

export type AutomationRuntime = ReturnType<typeof createAutomationRuntime>;
export type { AutomationJobKind };
