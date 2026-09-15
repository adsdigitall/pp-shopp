import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Clock, Loader2, PartyPopper, Send, Share, ShoppingCart, Smartphone, X } from 'lucide-react';
import { Icon3D } from '@/components/ui/Icon3D';
import { formatRelativeTime } from '@/services/dashboard';
import { disablePush, enablePush, getPushState, sendTestPush, type PushState, type SaleAlert } from '@/services/pushNotifications';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SaleAlert[];
  checkedAt: string | null;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

const KIND_ICON = { paid: ShoppingCart, payment_confirmed: CheckCircle2, completed: PartyPopper, unpaid: Clock, summary: ShoppingCart } as const;

export function NotificationsModal({ isOpen, onClose, alerts, checkedAt, onShowToast }: NotificationsModalProps) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState<'enable' | 'disable' | 'test' | null>(null);

  const refresh = useCallback(async () => setState(await getPushState()), []);

  useEffect(() => {
    if (isOpen) void refresh();
  }, [isOpen, refresh]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const run = async (kind: 'enable' | 'disable' | 'test') => {
    setBusy(kind);
    try {
      if (kind === 'enable') {
        await enablePush();
        const result = await sendTestPush().catch(() => ({ sent: 0 }));
        onShowToast('Notificações ativadas', result.sent ? 'Mandamos um aviso de teste para este aparelho.' : 'Você vai ser avisado quando sair uma venda.', 'success');
      } else if (kind === 'disable') {
        await disablePush();
        onShowToast('Notificações desligadas neste aparelho', undefined, 'info');
      } else {
        const result = await sendTestPush();
        onShowToast(result.sent ? 'Aviso de teste enviado' : 'Nenhum aparelho recebeu', result.sent ? `Entregue em ${result.sent} ${result.sent === 1 ? 'aparelho' : 'aparelhos'}.` : 'Ative as notificações neste aparelho primeiro.', result.sent ? 'success' : 'info');
      }
    } catch (error) {
      onShowToast('Não deu certo', error instanceof Error ? error.message : 'Tente novamente.', 'error');
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  const support = state?.support;
  const denied = state?.permission === 'denied';

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="sale-alerts-title">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-[var(--surface-scrim)] backdrop-blur-sm" />
      <div className="relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-[var(--border-default)] bg-[var(--surface-card)] sm:rounded-3xl">
        <div className="flex items-start gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
          <Icon3D icon={Bell} size={44} />
          <div className="min-w-0 flex-1">
            <h2 id="sale-alerts-title" className="text-lg font-bold text-[var(--text-title)]">Avisos de venda</h2>
            <p className="text-[13px] text-[var(--text-secondary)]">Receba no celular quando sair venda ou pedido aguardando pagamento.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-title)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card-raised)] p-4">
            {!state ? (
              <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 className="h-4 w-4 animate-spin" /> Verificando este aparelho…</p>
            ) : support === 'ios-needs-install' ? (
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 font-semibold text-[var(--text-title)]"><Smartphone className="h-4 w-4 text-[var(--brand-500)]" /> No iPhone, instale o app primeiro</p>
                <p className="text-[var(--text-secondary)]">Toque em <Share className="inline h-4 w-4 align-[-3px]" /> <strong className="text-[var(--text-title)]">Compartilhar</strong> no Safari, depois em <strong className="text-[var(--text-title)]">Adicionar à Tela de Início</strong>. Abra o Radar pelo ícone e ative aqui.</p>
              </div>
            ) : support === 'unsupported' ? (
              <p className="text-sm text-[var(--text-secondary)]">Este navegador não aceita notificações. Use o Chrome no Android ou no computador.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${state.enabled ? 'bg-[var(--green-500)]' : 'bg-[var(--amber-500)]'}`} />
                  <p className="text-sm font-semibold text-[var(--text-title)]">{state.enabled ? 'Ativadas neste aparelho' : 'Desligadas neste aparelho'}</p>
                  {state.devices > 0 && <span className="ml-auto text-xs text-[var(--text-muted)]">{state.devices} {state.devices === 1 ? 'aparelho' : 'aparelhos'} no total</span>}
                </div>
                {denied && !state.enabled && (
                  <p className="rounded-xl bg-[var(--surface-amber-soft)] px-3 py-2 text-xs text-[var(--amber-400)]">O navegador bloqueou as notificações do Radar. Libere em Configurações do site (cadeado na barra de endereço) e tente de novo.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {state.enabled ? (
                    <>
                      <button type="button" onClick={() => void run('test')} disabled={busy !== null} className="btn-brand inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold">
                        {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar teste
                      </button>
                      <button type="button" onClick={() => void run('disable')} disabled={busy !== null} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm font-semibold text-[var(--text-title)] hover:bg-[var(--surface-hover)] disabled:opacity-50">
                        {busy === 'disable' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />} Desligar
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => void run('enable')} disabled={busy !== null} className="btn-brand inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold">
                      {busy === 'enable' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Ativar notificações neste aparelho
                    </button>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">Avisamos: venda paga, pedido aguardando pagamento, pagamento confirmado e venda concluída. Ative em cada aparelho que quiser receber.</p>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-[var(--text-title)]">Últimos avisos</h3>
              {checkedAt && <span className="text-[11px] text-[var(--text-muted)]">Shopee conferida {formatRelativeTime(checkedAt).toLowerCase()}</span>}
            </div>
            {alerts.length === 0 ? (
              <p className="empty-state mt-2 px-4 py-6 text-center text-[13px] text-[var(--text-secondary)]">Nenhum aviso ainda. Quando sair uma venda nova, ela aparece aqui e no seu celular.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
                {alerts.map((alert) => (
                  <li key={alert.id} className="flex items-start gap-3 py-3">
                    <Icon3D icon={KIND_ICON[alert.kind] || ShoppingCart} size={36} tone={alert.kind === 'unpaid' ? 'dark' : 'orange'} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--text-title)]">{alert.title}</span>
                      <span className="block text-xs leading-5 text-[var(--text-secondary)]">{alert.body}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{formatRelativeTime(alert.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
