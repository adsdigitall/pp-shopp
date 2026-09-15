import { useState } from 'react';
import { Check, Copy, CopyPlus, ExternalLink, Eye, Globe, Link2, MoreHorizontal, MousePointerClick, Pencil, Share2, ShoppingBag, Trash2, Users, EyeOff } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { publicPageUrl, type PublicPageData } from '@/services/publicPages';

const TYPE_ICON = { vitrine: ShoppingBag, convite: Users, linktree: Link2 } as const;
const num = (value: number) => value.toLocaleString('pt-BR');

interface PageCardProps {
  page: PublicPageData;
  busy: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onCopied: () => void;
}

export function PageCard({ page, busy, onEdit, onDuplicate, onDelete, onToggleStatus, onCopied }: PageCardProps) {
  const [copied, setCopied] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const url = publicPageUrl(page.slug);
  const published = page.status === 'published';
  const Icon = TYPE_ICON[page.type];
  const itemCount = page.type === 'vitrine' ? page.products.length : page.type === 'convite' ? page.groups.length : page.links.length;
  const itemLabel = page.type === 'vitrine' ? (itemCount === 1 ? 'oferta' : 'ofertas') : page.type === 'convite' ? (itemCount === 1 ? 'grupo' : 'grupos') : (itemCount === 1 ? 'link' : 'links');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopied();
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* navegador sem permissão de área de transferência */
    }
  };

  const stats = [
    { icon: Eye, value: page.stats.visits, label: 'Visitas' },
    { icon: MousePointerClick, value: page.stats.clicks, label: 'Cliques' },
    { icon: Share2, value: page.stats.shares, label: 'Compartilh.' },
  ];

  return (
    <article className={`panel flex flex-col overflow-hidden transition-opacity ${busy ? 'opacity-60' : ''}`}>
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--surface-card-raised)]">
        {page.coverUrl && !imageFailed ? (
          <img src={page.coverUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full bg-white object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[var(--surface-brand-soft)]">
            <span className="btn-brand grid h-14 w-14 place-items-center rounded-2xl">
              <Icon className="h-7 w-7" />
            </span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-[var(--surface-scrim)] px-2.5 py-1 text-xs font-medium text-[var(--text-title)] backdrop-blur">
          {itemCount} {itemLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-[var(--text-title)]" title={page.name}>{page.name}</h3>
            <p className="mt-0.5 line-clamp-2 min-h-[40px] text-[13px] leading-5 text-[var(--text-secondary)]">
              {page.description || 'Sem descrição.'}
            </p>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${published ? 'bg-[var(--surface-green-soft)] text-[var(--green-400)]' : 'bg-[var(--surface-amber-soft)] text-[var(--amber-400)]'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${published ? 'bg-[var(--green-400)]' : 'bg-[var(--amber-400)]'}`} />
            {published ? 'Publicada' : 'Rascunho'}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Mais opções" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-title)]">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[190px] border-[var(--border-default)] bg-[var(--surface-card-raised)] text-[var(--text-body)]">
              <DropdownMenuItem onSelect={onToggleStatus} disabled={busy} className="gap-2">
                {published ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                {published ? 'Voltar para rascunho' : 'Publicar página'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open(url, '_blank', 'noopener')} disabled={!published} className="gap-2">
                <ExternalLink className="h-4 w-4" /> Abrir página
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void copy()} className="gap-2">
                <Copy className="h-4 w-4" /> Copiar link
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />
              <DropdownMenuItem onSelect={onDelete} disabled={busy} className="gap-2 text-[var(--red-400)] focus:text-[var(--red-400)]">
                <Trash2 className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card-raised)] py-2.5">
          {stats.map(({ icon: StatIcon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5 px-1 text-center">
              <span className="flex items-center gap-1.5 text-[var(--text-title)]">
                <StatIcon className="h-3.5 w-3.5 text-[var(--brand-500)]" />
                <span className="rdo-num text-base font-bold">{num(value)}</span>
              </span>
              <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-input)] py-1.5 pl-3 pr-1.5">
          <Globe className={`h-4 w-4 shrink-0 ${published ? 'text-[var(--green-400)]' : 'text-[var(--text-muted)]'}`} />
          <span className={`min-w-0 flex-1 truncate text-[13px] ${published ? 'text-[var(--text-body)]' : 'text-[var(--text-muted)]'}`} title={url}>
            {url.replace(/^https?:\/\//, '')}
          </span>
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--text-brand)] transition-colors hover:bg-[var(--surface-active)]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        {!published && <p className="-mt-1.5 text-[11px] text-[var(--text-muted)]">O link só abre depois de publicar.</p>}

        <div className="mt-auto grid grid-cols-3 gap-2 pt-1">
          <button type="button" onClick={onEdit} disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] py-2 text-[13px] font-semibold text-[var(--text-title)] transition-colors hover:border-[var(--border-brand)] hover:bg-[var(--surface-active)] disabled:opacity-50">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          <button type="button" onClick={onDuplicate} disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] py-2 text-[13px] font-semibold text-[var(--text-title)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] disabled:opacity-50">
            <CopyPlus className="h-3.5 w-3.5" /> Duplicar
          </button>
          <button type="button" onClick={onDelete} disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] py-2 text-[13px] font-semibold text-[var(--red-400)] transition-colors hover:border-[var(--red-400)] hover:bg-[var(--surface-red-soft)] disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        </div>
      </div>
    </article>
  );
}
