import React, { useState } from 'react';
import { FileText, Plus, Users, Link2, Palette, Globe, Trash2, Edit, Eye, Copy, Check, X, Send } from 'lucide-react';
import { PublicPage, PageType, PageStatus } from '../types/product';

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
    <section id="paginas" className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-black text-slate-900">Páginas</h2>
          <p className="mt-1 text-xs text-slate-500">Suas páginas públicas: vitrine de ofertas, convite pra grupos e link na bio. Um link só pra compartilhar.</p>
        </div>
        <button type="button" onClick={() => setShowModal(true)} className="rounded-xl bg-[#EE4D2D] px-4 py-2.5 text-xs font-black text-white hover:bg-orange-600 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova vitrine
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {pageTypes.map(type => (
          <button
            key={type.id}
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-orange-300 flex items-center gap-2"
          >
            {type.icon}
            {type.label}
          </button>
        ))}
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-100 max-w-sm mx-auto space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-500">Nenhuma página criada ainda. Crie sua primeira vitrine!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map(page => (
            <div key={page.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-100">
                    {page.type === 'vitrine' && <FileText className="w-6 h-6 text-orange-700" />}
                    {page.type === 'convite' && <Users className="w-6 h-6 text-orange-700" />}
                    {page.type === 'linktree' && <Link2 className="w-6 h-6 text-orange-700" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{page.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${page.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {page.status === 'published' ? 'Publicada' : 'Rascunho'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{page.products.length} produtos · criada em {new Date(page.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onEditPage(page)} className="p-1.5 rounded hover:bg-slate-100"><Edit className="w-4 h-4 text-slate-400" /></button>
                  <button onClick={() => onPublishPage(page.id)} className="p-1.5 rounded hover:bg-slate-100"><Globe className="w-4 h-4 text-slate-400" /></button>
                  <button onClick={() => { navigator.clipboard.writeText(`https://seudominio.com/${page.slug}`); onShowToast('Link copiado', 'Link da página copiado para a área de transferência.', 'success'); }} className="p-1.5 rounded hover:bg-slate-100"><Copy className="w-4 h-4 text-slate-400" /></button>
                  <button onClick={() => onDeletePage(page.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
                  <Plus className="w-3 h-3" /> Adicionar ofertas
                </button>
                <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
                  <Palette className="w-3 h-3" /> Personalizar
                </button>
                {page.status === 'draft' && (
                  <button onClick={() => onPublishPage(page.id)} className="rounded-lg bg-[#EE4D2D] px-3 py-1.5 text-xs font-black text-white hover:bg-orange-600 flex items-center gap-1.5">
                    <Globe className="w-3 h-3" /> Publicar vitrine
                  </button>
                )}
                <button onClick={() => onDeletePage(page.id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 flex items-center gap-1.5">
                  <Trash2 className="w-3 h-3" /> Apagar coleção
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Vitrine */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-900">Nova vitrine</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-xs text-slate-500">Dê um nome — você adiciona as ofertas em seguida.</p>
              <input
                type="text"
                placeholder="Nome da vitrine (ex.: Achados da semana)"
                value={pageName}
                onChange={e => setPageName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-orange-400"
                autoFocus
              />
              <div className="grid grid-cols-3 gap-2">
                {pageTypes.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`rounded-xl border-2 p-3 text-center transition ${selectedType === type.id ? 'border-[#EE4D2D] bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}
                  >
                    <div className="mb-1">{type.icon}</div>
                    <div className="text-[10px] font-bold text-slate-700">{type.label}</div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button onClick={handleCreate} disabled={!pageName.trim()} className="flex-1 rounded-xl bg-[#EE4D2D] py-2 text-xs font-black text-white hover:bg-orange-600 disabled:opacity-50">Criar vitrine</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PaginasPage;