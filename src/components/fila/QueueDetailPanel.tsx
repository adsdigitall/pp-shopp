import { useEffect, useState, type ReactNode } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, Circle, Clock, Copy, Package, Send, Trash2, Users, X, XCircle } from 'lucide-react';
import type { Group, QueueItem } from '../../types/product';
import { fetchQueuePreview, formatBRL, formatInterval, formatWhen, inferMarketplace, marketplaceInfo, type DispatchEvent, type QueueProductSummary, type ScheduledDispatch } from '@/services/queueOverview';
import { StatusPill, type QueueTone } from './QueueRow';

type PanelProps = {
  onClose: () => void;
  groupsCatalog: Group[];
} & (
  | { kind: 'pending'; item: QueueItem; automationGroups: { id: string; name?: string }[]; onCopy: () => void; onRemove: () => void; onSendNow?: () => void; onSeeGroups: () => void }
  | { kind: 'scheduled'; dispatch: ScheduledDispatch; onCancel: () => void }
  | { kind: 'sent' | 'failed'; event: DispatchEvent; onCopy: () => void }
);

const SCHEDULED_LABEL: Record<ScheduledDispatch['status'], { tone: QueueTone; label: string }> = {
  pending: { tone: 'scheduled', label: 'Agendada' },
  running: { tone: 'running', label: 'Enviando' },
  paused: { tone: 'pending', label: 'Pausada' },
  waiting_connection: { tone: 'failed', label: 'Aguardando WhatsApp' },
};

function ProductHeader({ product }: { product: QueueProductSummary }) {
  const mp = marketplaceInfo(inferMarketplace(product.marketplace, product.affiliateUrl));
  return (
    <div className="flex gap-3">
      <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
        {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-7 w-7 text-[var(--ink-500)]" />}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-semibold text-[var(--text-title)]">{product.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {product.price != null && <span className="rdo-num text-sm font-bold text-[var(--text-title)]">{formatBRL(product.price)}</span>}
          {product.originalPrice != null && product.price != null && product.originalPrice > product.price && (
            <span className="rdo-num text-xs text-[var(--text-muted)] line-through">{formatBRL(product.originalPrice)}</span>
          )}
          {product.discount != null && product.discount > 0 && (
            <span className="rounded-md border border-[rgba(34,197,94,.35)] bg-[var(--surface-green-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--green-400)]">{Math.round(product.discount)}% OFF</span>
          )}
        </div>
        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          {mp.logo && <img src={mp.logo} alt="" className="h-4 w-4 rounded object-contain" />}{mp.label}
        </p>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="border-t border-[var(--border-subtle)] pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-title)]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--border-subtle)] p-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
      <div className="min-w-0">
        <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
        <p className="text-[13px] font-semibold text-[var(--text-title)]">{value}</p>
      </div>
    </div>
  );
}

const productFromItem = (item: QueueItem): QueueProductSummary => ({
  name: item.product.name,
  image: item.product.imageUrl || null,
  price: item.product.currentPrice ?? null,
  originalPrice: item.product.originalPrice ?? null,
  discount: item.product.discountPercentage ?? null,
  marketplace: item.product.marketplace,
  affiliateUrl: item.product.affiliateUrl || null,
});

export function QueueDetailPanel(props: PanelProps) {
  const [preview, setPreview] = useState<{ message: string; templateConfigured: boolean } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const pendingId = props.kind === 'pending' ? props.item.id : null;

  useEffect(() => {
    if (!pendingId) return;
    const controller = new AbortController();
    setPreview(null);
    setPreviewError(null);
    fetchQueuePreview(pendingId, controller.signal)
      .then((body) => setPreview(body))
      .catch((error) => { if (!controller.signal.aborted) setPreviewError(error instanceof Error ? error.message : 'Prévia indisponível.'); });
    return () => controller.abort();
  }, [pendingId]);

  const membersOf = (id: string) => {
    const group = props.groupsCatalog.find((g) => String(g.id) === String(id));
    return group && Number(group.memberCount) ? `${Number(group.memberCount).toLocaleString('pt-BR')} participantes` : null;
  };

  let pill: { tone: QueueTone; label: string };
  let product: QueueProductSummary;
  if (props.kind === 'pending') { pill = { tone: 'pending', label: 'Pendente' }; product = productFromItem(props.item); }
  else if (props.kind === 'scheduled') { pill = SCHEDULED_LABEL[props.dispatch.status]; product = props.dispatch.product; }
  else if (props.kind === 'sent') { pill = { tone: 'sent', label: 'Enviada' }; product = props.event.product; }
  else { pill = { tone: 'failed', label: 'Falha' }; product = props.event.product; }

  const checklist = props.kind === 'pending' ? [
    { label: 'Produto completo', ok: Boolean(props.item.product.name?.trim()) && Number(props.item.product.currentPrice) > 0 },
    { label: 'Link de afiliado', ok: /^https?:\/\/\S+$/i.test(String(props.item.product.affiliateUrl || '')) },
    { label: 'Grupos definidos', ok: props.automationGroups.length > 0 },
    { label: 'Mensagem configurada', ok: Boolean(preview?.templateConfigured) },
  ] : [];
  const checklistDone = checklist.filter((c) => c.ok).length;

  return (
    <aside className="panel flex flex-col gap-3 p-4 sm:p-5" aria-label="Detalhes da oferta">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-[var(--text-title)]">Detalhes da oferta</h2>
        <div className="flex items-center gap-2">
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
          <button type="button" onClick={props.onClose} aria-label="Fechar detalhes" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-title)]"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <ProductHeader product={product} />

      {props.kind === 'pending' && (
        <>
          <Section
            title="Mensagem que será enviada"
            action={preview && (
              <button type="button" onClick={() => { void navigator.clipboard?.writeText(preview.message); }} className="inline-flex items-center gap-1 text-xs text-[var(--brand-400)] hover:underline">
                <Copy className="h-3.5 w-3.5" /> Copiar texto
              </button>
            )}
          >
            <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-raised)] p-3 text-[13px] leading-relaxed text-[var(--text-body)]">
              {preview ? preview.message : previewError ? <span className="text-[var(--red-400)]">{previewError}</span> : <span className="text-[var(--text-muted)]">Montando a prévia…</span>}
            </div>
            {preview && !preview.templateConfigured && <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">Usando o modelo padrão: defina o seu na Automação.</p>}
          </Section>

          <Section
            title={`Grupos que vão receber (${props.automationGroups.length})`}
            action={<button type="button" onClick={props.onSeeGroups} className="inline-flex items-center gap-0.5 text-xs text-[var(--brand-400)] hover:underline">Ver todos <ChevronRight className="h-3.5 w-3.5" /></button>}
          >
            {props.automationGroups.length ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {props.automationGroups.slice(0, 4).map((group) => (
                  <div key={group.id} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[var(--border-subtle)] p-2.5">
                    <Users className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[var(--text-title)]">{group.name || group.id}</p>
                      {membersOf(group.id) && <p className="text-[11px] text-[var(--text-muted)]">{membersOf(group.id)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--amber-400)]">Nenhum grupo definido na Automação: "Disparar agora" não tem para onde enviar.</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <InfoTile icon={Clock} label="Envio" value="Imediato ao disparar" />
              <InfoTile icon={CalendarDays} label="Na fila desde" value={formatWhen(props.item.addedAt)} />
            </div>
          </Section>

          <Section title="Checklist de envio" action={<span className="text-xs text-[var(--text-secondary)]">{checklistDone}/{checklist.length}</span>}>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]">
              <div className="h-full rounded-full bg-[var(--green-500)] transition-all" style={{ width: `${(checklistDone / checklist.length) * 100}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {checklist.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-body)]">
                  {c.ok ? <CheckCircle2 className="h-4 w-4 text-[var(--green-500)]" /> : <Circle className="h-4 w-4 text-[var(--text-muted)]" />}{c.label}
                </span>
              ))}
            </div>
          </Section>

          <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
            <button type="button" onClick={props.onCopy} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-3 text-[13px] text-[var(--text-body)] hover:border-[var(--border-brand)]"><Copy className="h-4 w-4" /> Copiar link</button>
            <button type="button" onClick={props.onRemove} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[rgba(239,68,68,.35)] px-3 text-[13px] text-[var(--red-400)] hover:bg-[var(--surface-red-soft)]"><Trash2 className="h-4 w-4" /> Remover</button>
            {props.onSendNow && (
              <button type="button" onClick={props.onSendNow} disabled={!props.automationGroups.length} className="btn-brand ml-auto inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-bold disabled:cursor-not-allowed"><Send className="h-4 w-4" /> Disparar agora</button>
            )}
          </div>
        </>
      )}

      {props.kind === 'scheduled' && (
        <>
          <Section title={`Grupos (${props.dispatch.groupsCount})`}>
            <div className="flex flex-wrap gap-1.5">
              {props.dispatch.groups.slice(0, 8).map((g) => <span key={g.id} className="rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-body)]">{g.name}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <InfoTile icon={Clock} label="Intervalo entre envios" value={formatInterval(props.dispatch.interval)} />
              <InfoTile icon={CalendarDays} label={props.dispatch.scheduledAt ? 'Agendado para' : 'Criado em'} value={formatWhen(props.dispatch.scheduledAt || props.dispatch.createdAt)} />
            </div>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              {props.dispatch.automatic ? 'Oferta da automação. ' : 'Disparo manual. '}Progresso: {props.dispatch.sent} de {props.dispatch.total} envio(s).
            </p>
          </Section>
          <div className="flex justify-end border-t border-[var(--border-subtle)] pt-3">
            <button type="button" onClick={props.onCancel} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[rgba(239,68,68,.35)] px-3 text-[13px] text-[var(--red-400)] hover:bg-[var(--surface-red-soft)]"><XCircle className="h-4 w-4" /> Cancelar este disparo</button>
          </div>
        </>
      )}

      {(props.kind === 'sent' || props.kind === 'failed') && (
        <>
          <Section title={`Grupos (${props.event.groupsCount})`}>
            <div className="flex flex-wrap gap-1.5">
              {props.event.groupNames.slice(0, 8).map((name) => <span key={name} className="rounded-lg border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-body)]">{name}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <InfoTile icon={CalendarDays} label={props.kind === 'sent' ? 'Enviada em' : 'Falhou em'} value={formatWhen(props.event.at)} />
              <InfoTile icon={Send} label="Origem" value={props.event.automatic ? 'Automação' : 'Manual'} />
            </div>
            {props.kind === 'failed' && props.event.error && (
              <p className="mt-2 rounded-xl border border-[rgba(239,68,68,.3)] bg-[var(--surface-red-soft)] p-2.5 text-xs text-[var(--red-400)]">{props.event.error}</p>
            )}
          </Section>
          {product.affiliateUrl && (
            <div className="flex justify-end border-t border-[var(--border-subtle)] pt-3">
              <button type="button" onClick={props.onCopy} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-3 text-[13px] text-[var(--text-body)] hover:border-[var(--border-brand)]"><Copy className="h-4 w-4" /> Copiar link</button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
