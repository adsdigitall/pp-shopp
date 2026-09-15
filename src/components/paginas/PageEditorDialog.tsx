import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Loader2, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import type { Product } from '@/types/product';
import { PAGE_TYPE_INFO, type PageGroup, type PageInput, type PageLink, type PageProduct, type PageType, type PublicPageData } from '@/services/publicPages';

const MAX_PRODUCTS = 60;
const brl = (value: number | null) => (value == null ? '' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const slugify = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const isHttp = (value: string) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(value.trim());
const isInvite = (value: string) => /^https?:\/\/(chat\.whatsapp\.com|wa\.me|t\.me|telegram\.me)\/\S+/i.test(value.trim());

const toPageProduct = (p: Product): PageProduct => ({
  id: p.id,
  name: p.name,
  imageUrl: p.imageUrl || null,
  currentPrice: p.currentPrice,
  originalPrice: p.originalPrice,
  affiliateUrl: p.affiliateUrl,
  marketplace: p.marketplace,
});

const productKey = (p: { id: string | null; affiliateUrl: string }) => p.id || p.affiliateUrl;

const fieldClass = 'w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2.5 text-sm text-[var(--text-title)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--border-brand)]';
const labelClass = 'mb-1.5 block text-[13px] font-semibold text-[var(--text-title)]';

interface PageEditorDialogProps {
  open: boolean;
  type: PageType;
  page: PublicPageData | null;
  queueProducts: Product[];
  garimparProducts: Product[];
  saving: boolean;
  onClose: () => void;
  onSave: (input: PageInput) => void;
}

export function PageEditorDialog({ open, type, page, queueProducts, garimparProducts, saving, onClose, onSave }: PageEditorDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [published, setPublished] = useState(true);
  const [coverImage, setCoverImage] = useState('');
  const [products, setProducts] = useState<PageProduct[]>([]);
  const [groups, setGroups] = useState<PageGroup[]>([]);
  const [links, setLinks] = useState<PageLink[]>([]);
  const [source, setSource] = useState<'fila' | 'garimpar'>('fila');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(page?.name || '');
    setDescription(page?.description || '');
    setSlug(page?.slug || '');
    setSlugTouched(Boolean(page));
    setPublished(page ? page.status === 'published' : true);
    setCoverImage(page?.coverImage || '');
    setProducts(page?.products || []);
    setGroups(page?.groups?.length ? page.groups : [{ name: '', description: '', inviteUrl: '' }]);
    setLinks(page?.links?.length ? page.links : [{ title: '', url: '' }]);
    setSource(queueProducts.length ? 'fila' : 'garimpar');
    setQuery('');
    setError('');
  }, [open, page, queueProducts.length]);

  const info = PAGE_TYPE_INFO[type];
  const selectedKeys = useMemo(() => new Set(products.map(productKey)), [products]);
  const pool = useMemo(() => {
    const list = (source === 'fila' ? queueProducts : garimparProducts).filter((p) => p.affiliateUrl && p.name);
    const q = query.trim().toLowerCase();
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  }, [source, queueProducts, garimparProducts, query]);

  const toggleProduct = (p: Product) => {
    const item = toPageProduct(p);
    const key = productKey(item);
    setProducts((prev) => {
      if (prev.some((x) => productKey(x) === key)) return prev.filter((x) => productKey(x) !== key);
      if (prev.length >= MAX_PRODUCTS) return prev;
      return [...prev, item];
    });
  };

  const move = <T,>(list: T[], index: number, delta: number) => {
    const next = [...list];
    const target = index + delta;
    if (target < 0 || target >= next.length) return list;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  const submit = () => {
    if (!name.trim()) return setError('Dê um nome para a página.');
    if (coverImage.trim() && !isHttp(coverImage)) return setError('A imagem de capa precisa ser um link começando com https://');
    const input: PageInput = {
      type,
      name: name.trim(),
      description: description.trim(),
      status: published ? 'published' : 'draft',
      coverImage: coverImage.trim() || null,
    };
    if (slug.trim()) input.slug = slugify(slug);
    if (type === 'vitrine') {
      if (published && !products.length) return setError('Escolha pelo menos uma oferta para publicar a vitrine.');
      input.products = products;
    }
    if (type === 'convite') {
      const filled = groups.filter((g) => g.name.trim() || g.inviteUrl.trim());
      const invalid = filled.find((g) => !g.name.trim() || !isInvite(g.inviteUrl));
      if (invalid) return setError('Cada grupo precisa de nome e link de convite do WhatsApp (chat.whatsapp.com) ou Telegram (t.me).');
      if (published && !filled.length) return setError('Adicione pelo menos um grupo para publicar.');
      input.groups = filled.map((g) => ({ name: g.name.trim(), description: g.description.trim(), inviteUrl: g.inviteUrl.trim() }));
    }
    if (type === 'linktree') {
      const filled = links.filter((l) => l.title.trim() || l.url.trim());
      const invalid = filled.find((l) => !l.title.trim() || !isHttp(l.url));
      if (invalid) return setError('Cada link precisa de título e endereço começando com https://');
      if (published && !filled.length) return setError('Adicione pelo menos um link para publicar.');
      input.links = filled.map((l) => ({ title: l.title.trim(), url: l.url.trim() }));
    }
    setError('');
    onSave(input);
  };

  const origin = typeof window !== 'undefined' ? window.location.host : '';

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && !saving) onClose(); }}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-24px)] flex-col gap-0 overflow-hidden rounded-2xl border-[var(--border-default)] bg-[var(--surface-card)] p-0 text-[var(--text-body)] sm:max-w-2xl">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4 pr-12">
          <DialogTitle className="text-lg font-bold text-[var(--text-title)]">{page ? `Editar ${info.singular}` : info.newLabel}</DialogTitle>
          <DialogDescription className="mt-1 text-[13px] text-[var(--text-secondary)]">{info.empty}</DialogDescription>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="page-name">Nome</label>
              <input
                id="page-name"
                className={fieldClass}
                value={name}
                maxLength={80}
                placeholder="Ex.: Achadinhos da Carol"
                onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="page-slug">Endereço do link</label>
              <div className="flex items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-input)] focus-within:border-[var(--border-brand)]">
                <span className="max-w-[45%] truncate pl-3 text-[13px] text-[var(--text-muted)]">{origin}/p/</span>
                <input
                  id="page-slug"
                  className="w-full min-w-0 bg-transparent py-2.5 pr-3 text-sm text-[var(--text-title)] outline-none"
                  value={slug}
                  maxLength={60}
                  placeholder="minha-vitrine"
                  onChange={(e) => { setSlugTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="page-description">Descrição</label>
            <textarea
              id="page-description"
              className={`${fieldClass} min-h-[64px] resize-none`}
              value={description}
              maxLength={200}
              placeholder="Uma frase curta que aparece no topo da página"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="page-cover">Imagem de capa <span className="font-normal text-[var(--text-muted)]">(opcional)</span></label>
            <input id="page-cover" className={fieldClass} value={coverImage} placeholder={type === 'vitrine' ? 'Se vazio, usa a foto da primeira oferta' : 'https://...'} onChange={(e) => setCoverImage(e.target.value)} />
          </div>

          {type === 'vitrine' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-[var(--text-title)]">
                  Ofertas da vitrine <span className="rdo-num font-normal text-[var(--text-secondary)]">{products.length}/{MAX_PRODUCTS}</span>
                </p>
                <div className="flex rounded-xl border border-[var(--border-default)] p-0.5 text-xs">
                  {([['fila', `Da fila (${queueProducts.length})`], ['garimpar', `Do Garimpar (${garimparProducts.length})`]] as const).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setSource(id)} className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors ${source === id ? 'bg-[var(--surface-active)] text-[var(--text-brand)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-title)]'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {products.length > 0 && (
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {products.map((p) => (
                    <div key={productKey(p)} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-white">
                      {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package className="m-auto mt-4 h-5 w-5 text-[var(--ink-500)]" />}
                      <button type="button" aria-label={`Tirar ${p.name}`} onClick={() => setProducts((prev) => prev.filter((x) => productKey(x) !== productKey(p)))} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--surface-scrim)] text-[var(--text-title)]">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input className={`${fieldClass} pl-9`} value={query} placeholder="Buscar oferta pelo nome" onChange={(e) => setQuery(e.target.value)} />
              </div>

              <div className="grid max-h-[300px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {pool.length === 0 && (
                  <p className="empty-state col-span-full px-4 py-6 text-center text-[13px] text-[var(--text-secondary)]">
                    {source === 'fila' ? 'Sua fila está vazia. Adicione ofertas pelo Garimpar.' : 'Nenhuma oferta carregada no Garimpar.'}
                  </p>
                )}
                {pool.map((p) => {
                  const selected = selectedKeys.has(productKey(toPageProduct(p)));
                  return (
                    <button
                      key={`${source}-${p.id}`}
                      type="button"
                      onClick={() => toggleProduct(p)}
                      className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition-colors ${selected ? 'border-[var(--border-brand)] bg-[var(--surface-selected)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'}`}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                        {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-[var(--ink-500)]" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-xs leading-4 text-[var(--text-title)]">{p.name}</span>
                        <span className="rdo-num text-xs font-bold text-[var(--text-brand)]">{brl(p.currentPrice)}</span>
                      </span>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected ? 'btn-brand border-transparent' : 'border-[var(--border-strong)]'}`}>
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {type === 'convite' && (
            <div className="space-y-2.5">
              <p className="text-[13px] font-semibold text-[var(--text-title)]">Grupos</p>
              {groups.map((g, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-raised)] p-3">
                  <div className="flex gap-2">
                    <input className={fieldClass} value={g.name} maxLength={80} placeholder="Nome do grupo" onChange={(e) => setGroups((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <button type="button" aria-label="Remover grupo" onClick={() => setGroups((prev) => prev.filter((_, j) => j !== i))} className="grid w-10 shrink-0 place-items-center rounded-xl border border-[var(--border-default)] text-[var(--red-400)] hover:bg-[var(--surface-red-soft)]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input className={fieldClass} value={g.inviteUrl} placeholder="https://chat.whatsapp.com/..." onChange={(e) => setGroups((prev) => prev.map((x, j) => (j === i ? { ...x, inviteUrl: e.target.value } : x)))} />
                  <input className={fieldClass} value={g.description} maxLength={200} placeholder="Descrição curta (opcional)" onChange={(e) => setGroups((prev) => prev.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                </div>
              ))}
              <button type="button" onClick={() => setGroups((prev) => [...prev, { name: '', description: '', inviteUrl: '' }])} disabled={groups.length >= 20} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-2 text-[13px] font-semibold text-[var(--text-title)] hover:border-[var(--border-brand)] disabled:opacity-50">
                <Plus className="h-4 w-4" /> Adicionar grupo
              </button>
            </div>
          )}

          {type === 'linktree' && (
            <div className="space-y-2.5">
              <p className="text-[13px] font-semibold text-[var(--text-title)]">Links</p>
              {links.map((l, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-raised)] p-3 sm:flex-row">
                  <input className={`${fieldClass} sm:w-[38%]`} value={l.title} maxLength={80} placeholder="Título (ex.: Meu Instagram)" onChange={(e) => setLinks((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  <input className={fieldClass} value={l.url} placeholder="https://..." onChange={(e) => setLinks((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label="Subir" onClick={() => setLinks((prev) => move(prev, i, -1))} className="grid h-10 w-9 place-items-center rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-title)]"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" aria-label="Descer" onClick={() => setLinks((prev) => move(prev, i, 1))} className="grid h-10 w-9 place-items-center rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-title)]"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" aria-label="Remover link" onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))} className="grid h-10 w-9 place-items-center rounded-xl border border-[var(--border-default)] text-[var(--red-400)] hover:bg-[var(--surface-red-soft)]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setLinks((prev) => [...prev, { title: '', url: '' }])} disabled={links.length >= 30} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-2 text-[13px] font-semibold text-[var(--text-title)] hover:border-[var(--border-brand)] disabled:opacity-50">
                <Plus className="h-4 w-4" /> Adicionar link
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-[var(--border-subtle)] px-5 py-4">
          {error && <p role="alert" className="rounded-xl bg-[var(--surface-red-soft)] px-3 py-2 text-[13px] text-[var(--red-400)]">{error}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--text-title)]">
              <button
                type="button"
                role="switch"
                aria-checked={published}
                onClick={() => setPublished((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${published ? 'bg-[var(--green-500)]' : 'bg-[var(--ink-600)]'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--white)] transition-all ${published ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
              {published ? 'Publicada (link no ar)' : 'Rascunho (link fora do ar)'}
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm font-semibold text-[var(--text-title)] hover:bg-[var(--surface-hover)] sm:flex-none">
                Cancelar
              </button>
              <button type="button" onClick={submit} disabled={saving} className="btn-brand inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold sm:flex-none">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {page ? 'Salvar alterações' : 'Criar página'}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
