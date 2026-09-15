import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Link2, Loader2, Megaphone, Plus, RotateCw, Share2, ShoppingBag, Sparkles, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { PageCard } from '@/components/paginas/PageCard';
import { PageEditorDialog } from '@/components/paginas/PageEditorDialog';
import { PAGE_TYPE_INFO, pagesApi, type PageInput, type PageType, type PublicPageData } from '@/services/publicPages';
import type { Product, QueueItem } from '../types/product';

interface PaginasPageProps {
  queueItems: QueueItem[];
  products: Product[];
  isActive: boolean;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

const TABS: { id: PageType; icon: typeof ShoppingBag }[] = [
  { id: 'vitrine', icon: ShoppingBag },
  { id: 'convite', icon: Users },
  { id: 'linktree', icon: Link2 },
];

const BENEFITS = [
  { icon: Share2, title: 'Um link pra tudo', text: 'Divulgue no Instagram, TikTok, WhatsApp e onde quiser.' },
  { icon: Megaphone, title: 'Mais gente nos grupos', text: 'Página de convite transforma seguidor em membro.' },
  { icon: BarChart3, title: 'Resultado medido', text: 'Veja visitas, cliques e compartilhamentos de cada página.' },
];

export function PaginasPage({ queueItems, products, isActive, onShowToast }: PaginasPageProps) {
  const [pages, setPages] = useState<PublicPageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<PageType>('vitrine');
  const [editor, setEditor] = useState<{ open: boolean; page: PublicPageData | null; type: PageType }>({ open: false, page: null, type: 'vitrine' });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<PublicPageData | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setPages(await pagesApi.list());
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar suas páginas.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarrega ao abrir a tela (as estatísticas mudam com as visitas).
  const loadedOnce = useRef(false);
  useEffect(() => {
    if (!isActive) return;
    void load(loadedOnce.current);
    loadedOnce.current = true;
  }, [isActive, load]);

  const queueProducts = useMemo(() => queueItems.map((item) => item.product).filter(Boolean), [queueItems]);
  const counts = useMemo(() => {
    const result: Record<PageType, number> = { vitrine: 0, convite: 0, linktree: 0 };
    pages.forEach((p) => { result[p.type] += 1; });
    return result;
  }, [pages]);
  const visible = pages.filter((p) => p.type === activeTab);
  const info = PAGE_TYPE_INFO[activeTab];

  const replace = (page: PublicPageData) => setPages((prev) => prev.map((p) => (p.id === page.id ? page : p)));
  const openNew = (type: PageType = activeTab) => setEditor({ open: true, page: null, type });

  const handleSave = async (input: PageInput) => {
    setSaving(true);
    try {
      if (editor.page) {
        replace(await pagesApi.update(editor.page.id, input));
        onShowToast('Página salva', input.status === 'published' ? 'As mudanças já estão no ar.' : 'Salva como rascunho.', 'success');
      } else {
        const created = await pagesApi.create(input);
        setPages((prev) => [created, ...prev]);
        setActiveTab(created.type);
        onShowToast('Página criada', created.status === 'published' ? 'Copie o link e compartilhe.' : 'Publique quando estiver pronta.', 'success');
      }
      setEditor((prev) => ({ ...prev, open: false }));
    } catch (error) {
      onShowToast('Não deu para salvar', error instanceof Error ? error.message : 'Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const withBusy = async (page: PublicPageData, action: () => Promise<void>) => {
    setBusyId(page.id);
    try {
      await action();
    } catch (error) {
      onShowToast('Algo deu errado', error instanceof Error ? error.message : 'Tente novamente.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = (page: PublicPageData) => withBusy(page, async () => {
    const next = page.status === 'published' ? 'draft' : 'published';
    replace(await pagesApi.update(page.id, { status: next }));
    onShowToast(next === 'published' ? 'Página publicada' : 'Página em rascunho', next === 'published' ? 'O link já está no ar.' : 'O link saiu do ar.', next === 'published' ? 'success' : 'info');
  });

  const handleDuplicate = (page: PublicPageData) => withBusy(page, async () => {
    const copy = await pagesApi.duplicate(page.id);
    setPages((prev) => [copy, ...prev]);
    onShowToast('Página duplicada', 'A cópia ficou como rascunho.', 'success');
  });

  const confirmDelete = () => {
    const page = toDelete;
    if (!page) return;
    setToDelete(null);
    void withBusy(page, async () => {
      await pagesApi.remove(page.id);
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      onShowToast('Página excluída', 'O link deixou de funcionar.', 'info');
    });
  };

  return (
    <section id="paginas" className="mx-auto w-full max-w-[1440px] space-y-5 pb-24">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] text-[var(--text-title)] sm:text-[34px]">Páginas</h1>
            <p className="mt-1 max-w-2xl text-[15px] text-[var(--text-body)]">Suas páginas públicas: vitrine de ofertas, convite pra grupos e link na bio. Um link só pra compartilhar.</p>
          </div>
          <button type="button" onClick={() => openNew()} className="btn-brand inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold">
            <Plus className="h-4 w-4" /> {info.newLabel}
          </button>
        </div>
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]" role="tablist">
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 pb-3 pt-1 text-[15px] transition-colors ${activeTab === id ? 'border-[var(--brand-500)] font-semibold text-[var(--text-title)]' : 'border-transparent font-medium text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`}
            >
              <Icon className={`h-4 w-4 ${activeTab === id ? 'text-[var(--brand-500)]' : ''}`} />
              {PAGE_TYPE_INFO[id].tab}
              {counts[id] > 0 && <span className="rdo-num rounded-full bg-[var(--surface-card-raised)] px-1.5 text-xs font-bold text-[var(--text-secondary)]">{counts[id]}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="rdo-skeleton h-[440px] rounded-[var(--r-card)]" />)}
        </div>
      ) : loadError ? (
        <div className="empty-state flex flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-[var(--text-title)]">Não foi possível carregar suas páginas</p>
          <p className="text-[13px] text-[var(--text-secondary)]">{loadError}</p>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-title)] hover:bg-[var(--surface-hover)]">
            <RotateCw className="h-4 w-4" /> Tentar de novo
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              busy={busyId === page.id}
              onEdit={() => setEditor({ open: true, page, type: page.type })}
              onDuplicate={() => void handleDuplicate(page)}
              onDelete={() => setToDelete(page)}
              onToggleStatus={() => void handleToggleStatus(page)}
              onCopied={() => onShowToast('Link copiado', undefined, 'success')}
            />
          ))}
          <button
            type="button"
            onClick={() => openNew()}
            className={`empty-state flex flex-col items-center justify-center gap-3 px-6 py-10 text-center transition-colors hover:border-[var(--border-brand)] hover:bg-[var(--surface-selected)] ${visible.length ? 'min-h-[200px]' : 'min-h-[320px] sm:col-span-2 xl:col-span-3'}`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-brand-soft)] text-[var(--brand-500)]"><Plus className="h-6 w-6" /></span>
            <span className="text-[15px] font-semibold text-[var(--text-title)]">{visible.length ? info.newLabel : `Você ainda não tem ${activeTab === 'linktree' ? 'uma LinkTree' : activeTab === 'convite' ? 'páginas de convite' : 'vitrines'}`}</span>
            <span className="max-w-sm text-[13px] text-[var(--text-secondary)]">{info.empty}</span>
          </button>
        </div>
      )}

      <div className="panel relative overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-start gap-4 lg:w-[38%]">
            <span className="btn-brand grid h-12 w-12 shrink-0 place-items-center rounded-2xl"><Sparkles className="h-6 w-6" /></span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[var(--text-title)]">Crie mais páginas e aumente seus resultados</h2>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">Cada página é mais uma porta de entrada pras suas ofertas.</p>
              <button type="button" onClick={() => openNew('vitrine')} className="btn-brand mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold">
                <Plus className="h-4 w-4" /> Nova vitrine
              </button>
            </div>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-raised)] p-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-brand-soft)] text-[var(--brand-500)]"><Icon className="h-4.5 w-4.5" /></span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text-title)]">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PageEditorDialog
        open={editor.open}
        type={editor.type}
        page={editor.page}
        queueProducts={queueProducts}
        garimparProducts={products}
        saving={saving}
        onClose={() => setEditor((prev) => ({ ...prev, open: false }))}
        onSave={(input) => void handleSave(input)}
      />

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => { if (!open) setToDelete(null); }}>
        <DialogContent className="w-[calc(100vw-24px)] rounded-2xl border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] sm:max-w-md">
          <DialogTitle className="text-lg font-bold text-[var(--text-title)]">Excluir “{toDelete?.name}”?</DialogTitle>
          <DialogDescription className="text-[13px] text-[var(--text-secondary)]">
            O link público para de funcionar e as estatísticas somem. Não dá para desfazer.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setToDelete(null)} className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm font-semibold text-[var(--text-title)] hover:bg-[var(--surface-hover)]">Cancelar</button>
            <button type="button" onClick={confirmDelete} className="inline-flex items-center gap-2 rounded-xl bg-[var(--red-500)] px-4 py-2.5 text-sm font-bold text-[var(--white)] hover:brightness-110">
              {busyId === toDelete?.id && <Loader2 className="h-4 w-4 animate-spin" />} Excluir página
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
