/**
 * Automation contracts for share / queue / retry work.
 * Etapa 1: types + in-memory runtime only. NO real dispatch.
 *
 * SECURITY: public share payloads MUST NOT include commission, Shopee
 * secrets, AppId, or private tokens. See `SENSITIVE_PUBLIC_KEYS`.
 */

/** Status oficial do envio (escopo da etapa). */
export const SHARE_JOB_STATUSES = [
  'pending',
  'processing',
  'ready',
  'sent',
  'failed',
] as const;
export type ShareJobStatus = (typeof SHARE_JOB_STATUSES)[number];

/** Formatos de compartilhamento suportados. */
export const SHARE_FORMATS = ['group_message', 'story'] as const;
export type ShareFormat = (typeof SHARE_FORMATS)[number];

export const SHARE_CHANNELS = [
  'whatsapp_group',
  'whatsapp_broadcast',
  'whatsapp_status',
  'telegram',
  'webhook',
  'mcp',
  'manual_copy',
] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export const WEBHOOK_EVENT_TYPES = [
  'share.job.created',
  'share.job.queued',
  'share.job.processing',
  'share.job.ready',
  'share.job.retry_scheduled',
  'share.job.sent',
  'share.job.failed',
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const AUTOMATION_JOB_KINDS = [
  'share.dispatch',
  'webhook.deliver',
  'mcp.notify',
] as const;
export type AutomationJobKind = (typeof AUTOMATION_JOB_KINDS)[number];

/** Clock injection so retry tests stay deterministic. */
export interface Clock {
  now: () => Date;
}

// ---------------------------------------------------------------------------
// SharePayload — conteúdo PÚBLICO da oferta
// ---------------------------------------------------------------------------

/**
 * Dados que podem ser montados para compartilhamento.
 * Lista fechada: qualquer campo fora daqui é rejeitado pelo sanitizador.
 *
 * PROIBIDO: commissionRate, commissionAmount, OPENAI_API_KEY,
 * SHOPEE_SECRET, tokens internos.
 */
export interface SharePayload {
  productId: string;
  title: string;
  generatedCopy: string;
  affiliateUrl: string;
  generatedImageUrl: string | null;
  currentPrice: number | null;
  originalPrice: number | null;
  discountPercentage: number | null;
  shippingHighlight: string | null;
  targetFormat: ShareFormat;
  cta: string | null;
}

export interface CreateSharePayloadInput {
  productId: string;
  title: string;
  generatedCopy: string;
  affiliateUrl: string;
  targetFormat: ShareFormat;
  generatedImageUrl?: string | null;
  currentPrice?: number | null;
  originalPrice?: number | null;
  discountPercentage?: number | null;
  shippingHighlight?: string | null;
  cta?: string | null;
}

/** Chaves públicas permitidas no SharePayload (whitelist). */
export const SHARE_PAYLOAD_KEYS = [
  'productId',
  'title',
  'generatedCopy',
  'affiliateUrl',
  'generatedImageUrl',
  'currentPrice',
  'originalPrice',
  'discountPercentage',
  'shippingHighlight',
  'targetFormat',
  'cta',
] as const;

// ---------------------------------------------------------------------------
// ShareDestination
// ---------------------------------------------------------------------------

export interface ShareDestination {
  id: string;
  name: string;
  channel: ShareChannel;
  /** Referência externa (id do grupo, número, url do webhook). */
  externalRef: string;
  /** Formatos aceitos por este destino. */
  supportedFormats: readonly ShareFormat[];
  enabled: boolean;
  createdAt: string;
}

export interface CreateShareDestinationInput {
  name: string;
  channel: ShareChannel;
  externalRef: string;
  supportedFormats?: readonly ShareFormat[];
}

// ---------------------------------------------------------------------------
// ShareJob
// ---------------------------------------------------------------------------

export interface CreateShareJobInput {
  destinationId: string;
  payload: SharePayload;
}

/**
 * Job de envio. Carrega o SharePayload público — nunca comissão nem secrets.
 */
export interface ShareJob {
  id: string;
  productId: string;
  destinationId: string;
  format: ShareFormat;
  payload: SharePayload;
  status: ShareJobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  nextAttemptAt: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// ShareResult / ShareHistory
// ---------------------------------------------------------------------------

export interface ShareResult {
  jobId: string;
  destinationId: string;
  productId: string;
  format: ShareFormat;
  success: boolean;
  dryRun: true;
  /** Trava dura: etapa 1 nunca dispara de verdade. */
  realDispatch: false;
  attempts: number;
  status: ShareJobStatus;
  error: string | null;
  recordedAt: string;
}

/** Registro histórico exigido: produto, destino, formato, data/hora, status, erro, tentativas. */
export interface ShareHistoryEntry {
  id: string;
  jobId: string;
  productId: string;
  destinationId: string;
  format: ShareFormat;
  status: ShareJobStatus;
  attempts: number;
  success: boolean;
  dryRun: true;
  realDispatch: false;
  error: string | null;
  /** data/hora do registro */
  recordedAt: string;
}

// ---------------------------------------------------------------------------
// Webhooks / runtime auxiliar
// ---------------------------------------------------------------------------

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  jobId: string;
  payload: SharePayload;
  createdAt: string;
  /** Etapa 1 records events only — never delivers them. */
  deliveryStatus: 'recorded';
}

export interface AutomationJob {
  id: string;
  kind: AutomationJobKind;
  shareJobId: string | null;
  status: ShareJobStatus;
  createdAt: string;
  error: string | null;
}

export interface DispatchAttemptResult {
  ok: boolean;
  dryRun: true;
  realDispatch: false;
  skipped?: boolean;
  reason?: string;
  error?: string;
  jobId?: string;
}

export interface ShareDispatcher {
  name: 'noop' | 'simulated-success';
  realDispatchEnabled: false;
  dispatch(job: ShareJob): Promise<DispatchAttemptResult>;
}

export interface FutureIntegration {
  name: 'whatsapp' | 'mcp' | 'jarvis';
  enabled: false;
  connect: () => never;
}

export interface RetryPolicy {
  maxAttempts: 3;
  /** Wait after attempt 1, then after attempt 2. Attempt 3 marks failed. */
  backoffMsAfterAttempt: readonly [number, number];
}

export type ProcessNextResult = DispatchAttemptResult;
