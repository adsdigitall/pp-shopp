import React, { useState } from 'react';
import { FileText, Plus, Users, Link2, Palette, Globe, Trash2, Edit, Eye, Copy, Check, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicPage, PageType, PageStatus } from '../types/product';
import { Button } from './ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/Dialog';
import { Badge } from './ui/Badge';

interface PaginasPageProps {
  pages: PublicPage[];
  onCreatePage: (page: Omit<PublicPage, 'id' | 'createdAt' | 'publishedAt'>) => void;
  onDeletePage: (pageId: string) => void;
  onEditPage: (page: PublicPage) => void;
  onPublishPage: (pageId: string) => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

const pageTypes: { id: PageType; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'vitrine', label: 'Vitrine de Ofertas', description: 'Exibe suas ofertas em uma página pública bonita', icon: <FileText className="w-5 h-5" /> },
  { id: 'convite', label: 'Convite para Grupos', description: 'Página para convidar pessoas para seus grupos', icon: <Users className="w-5 h-5" /> },
  { id: 'linktree', label: 'LinkTree Personalizada', description: 'Seu link na bio com todas as suas páginas', icon: <Link2 className="w-5 h-5" /> },
];

export const PaginasPage: React.FC<PaginasPageProps> = ({
  pages,
  onCreatePage,
  onDeletePage,
  onEditPage,
  onPublishPage,
  onShowToast,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [pageName, setPageName] = useState('');
  const [selectedType, setSelectedType] = useState<PageType>('vitrine');

  const handleCreate = () => {
    if (!pageName.trim()) return;
    onCreatePage({
      name: pageName,
      type: selectedType,
      status: 'draft',
      slug: pageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      products: [],
      customization: { theme: 'light', primaryColor: '#EE4D2D' },
    });
    setPageName('');
    setSelectedType('vitrine');
    setShowModal(false);
  };

  return (
    <section id="paginas" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-black text-[var(--text-primary)]">Páginas</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Suas páginas públicas: vitrine de ofertas, convite pra grupos e link na bio. Um link só pra compartilhar.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white">
          <Plus className="w-4 h-4" /> Nova vitrine
        </Button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {pageTypes.map(type => (
          <button
            key={type.id}
            type="button"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:border-[var(--primary)]/50 flex items-center gap-2"
          >
            {type.icon}
            {type.label}
          </button>
        ))}
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-12 px-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] max-w-sm mx-auto space-y-3">
          <div className="w-12 h-12 bg-[var(--surface-elevated)] text-[var(--text-secondary)] rounded-xl flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">Nenhuma página criada ainda. Crie sua primeira vitrine!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map(page => (
            <div key={page.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--primary)]/10">
                    {page.type === 'vitrine' && <FileText className="w-6 h-6 text-[var(--primary)]" />}
                    {page.type === 'convite' && <Users className="w-6 h-6 text-[var(--primary)]" />}
                    {page.type === 'linktree' && <Link2 className="w-6 h-6 text-[var(--primary)]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[var(--text-primary)]">{page.name}</p>
                      <Badge variant={page.status === 'published' ? 'success' : 'secondary'}>
                        {page.status === 'published' ? 'Publicada' : 'Rascunho'}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{page.products.length} produtos · criada em {new Date(page.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onEditPage(page)} className="p-1.5 rounded hover:bg-[var(--surface-hover)]"><Edit className="w-4 h-4 text-[var(--text-secondary)]" /></button>
                  <button onClick={() => onPublishPage(page.id)} className="p-1.5 rounded hover:bg-[var(--surface-hover)]"><Globe className="w-4 h-4 text-[var(--text-secondary)]" /></button>
                  <button onClick={() => { navigator.clipboard.writeText(`https://seudominio.com/${page.slug}`); onShowToast('Link copiado', 'Link da página copiado para a área de transferência.', 'success'); }} className="p-1.5 rounded hover:bg-[var(--surface-hover)]"><Copy className="w-4 h-4 text-[var(--text-secondary)]" /></button>
                  <button onClick={() => onDeletePage(page.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] flex items-center gap-1.5">
                  <Plus className="w-3 h-3" /> Adicionar ofertas
                </button>
                <button className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] flex items-center gap-1.5">
                  <Palette className="w-3 h-3" /> Personalizar
                </button>
                {page.status === 'draft' && (
                  <button onClick={() => onPublishPage(page.id)} className="rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-black text-white hover:bg-[var(--primary-hover)] flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Publicar vitrine
                  </button>
                )}
                <button onClick={() => onDeletePage(page.id)} className="rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/10 px-3 py-1.5 text-xs font-bold text-[var(--error)] hover:bg-red-100 flex items-center gap-1.5">
                  <Trash2 className="w-3 h-3" /> Apagar coleção
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Nova vitrine</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">Dê um nome — você adiciona as ofertas em seguida.</p>
            <input
              type="text"
              placeholder="Nome da vitrine (ex.: Achados da semana)"
              value={pageName}
              onChange={e => setPageName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-orange-400"
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2">
              {pageTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedType(type.id)}
                  className={cn(
                    'rounded-xl border-2 p-3 text-center transition',
                    selectedType === type.id ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                  )}
                >
                  <div className="mb-1">{type.icon}</div>
                  <div className="text-[10px] font-bold text-[var(--text-primary)]">{type.label}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]">Cancelar</button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={!pageName.trim()} className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white disabled:opacity-50">
                Criar vitrine
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PaginasPage;