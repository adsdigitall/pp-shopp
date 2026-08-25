/**
 * Automation contracts for future share / webhook / queue work.
 * Etapa 1: types and in-memory runtime only. No real dispatch.
 *
 * SECURITY: public share payloads MUST NOT include commission, Shopee
 * secrets, AppId, or private tokens. See `SENSITIVE_PUBLIC_KEYS`.
 */

export const SHARE_JOB_STATUSES = ['pending', 'processing', 'sent', 'failed'] as const;
export type ShareJobStatus = (typeof SHARE_JOB_STATUSES)[number];

export const SHARE_CHANNELS = [
  'whatsapp_group',
  'whatsapp_broadcast',
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

export interface CreateShareJobInput {
  productId: string;
  destinationId: string;
  message: string;
  imageUrl: string;
  affiliateUrl: string;
}

/**
 * Public share job. Intentionally omits commissionRate, commissionAmount,
 * Shopee Secret, AppId and private tokens.
 */
export interface ShareJob {
  id: string;
  productId: string;
  destinationId: string;
  message: string;
  imageUrl: string;
  affiliateUrl: string;
  status: ShareJobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  nextAttemptAt: string | null;
  error: string | null;
}

export interface ShareDestination {
  id: string;
  name: string;
  channel: ShareChannel;
  externalRef: string;
  enabled: boolean;
  createdAt: string;
}

export interface CreateShareDestinationInput {
  name: string;
  channel: ShareChannel;
  externalRef: string;
}

/**
 * Public message that would be posted to a group.
 * Never carries commission or secrets.
 */
export interface ShareMessage {
  jobId: string;
  destinationId: string;
  text: string;
  imageUrl: string;
  affiliateUrl: string;
}

export interface ShareResult {
  jobId: string;
  destinationId: string;
  success: boolean;
  dryRun: boolean;
  realDispatch: false;
  attempts: number;
  status: ShareJobStatus;
  error: string | null;
  recordedAt: string;
}

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  jobId: string;
  payload: PublicSharePayload;
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

export interface PublicSharePayload {
  jobId: string;
  productId: string;
  destinationId: string;
  message: string;
  imageUrl: string;
  affiliateUrl: string;
  status: ShareJobStatus;
  attempts: number;
}

export interface DispatchAttemptResult {
  ok: boolean;
  dryRun: true;
  realDispatch: false;
  skipped?: boolean;
  reason?: string;
  error?: string;
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

export interface ShareHistoryEntry {
  id: string;
  jobId: string;
  destinationId: string;
  status: ShareJobStatus;
  attempts: number;
  success: boolean;
  dryRun: true;
  realDispatch: false;
  error: string | null;
  recordedAt: string;
}

export interface ProcessNextResult extends DispatchAttemptResult {
  jobId?: string;
}
