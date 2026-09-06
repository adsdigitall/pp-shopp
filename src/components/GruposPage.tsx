import React, { useState } from 'react';
import { Users, Shield, Send, Search, Plus, Trash2, Check, X, AlertTriangle, Circle, CircleDot, BarChart2, Activity, ArrowDown } from 'lucide-react';
import { Group } from '../types/product';

interface GruposPageProps {
  groups: Group[];
  onSelectGroups: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const GruposPage: React.FC<GruposPageProps> = ({
  groups,
  onSelectGroups,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'protecao' | 'campanhas'>('monitor');

  const tabs = [
    { id: 'monitor' as const, label: 'Monitor', icon: <Activity className="w-4 h-4" /> },
    { id: 'protecao' as const, label: 'Proteção', icon: <Shield className="w-4 h-4" /> },
    { id: 'campanhas' as const, label: 'Campanhas', icon: <Send className="w-4 h-4" /> },
  ];

  return (
    <section id="grupos" className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-black text-slate-900">Meus Grupos</h2>
          <p className="mt-1 text-xs text-slate-500">Acompanhe a saúde dos seus grupos e mantenha eles limpos.</p>
        </div>
        <button type="button" onClick={onSelectGroups} className="rounded-xl bg-[#EE4D2D] px-4 py-2.5 text-xs font-black text-white hover:bg-orange-600 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Selecionar grupos
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-[#EE4D2D] text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'monitor' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Grupos ativos</p>
              <b className="block text-lg text-slate-700">{groups.filter(g => g.status === 'active' || g.status === 'healthy').length}</b>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Membros alcançados</p>
              <b className="block text-lg text-slate-700">{groups.reduce((sum, g) => sum + g.memberCount, 0)}</b>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Mensagens enviadas</p>
              <b className="block text-lg text-slate-700">{groups.reduce((sum, g) => sum + g.messagesSent30d, 0)}</b>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
            <p className="text-xs text-slate-500">Escolha quais grupos do seu WhatsApp aparecem em Meus Grupos.</p>
            <button type="button" onClick={onSelectGroups} className="mt-2 rounded-xl bg-[#EE4D2D] px-3 py-2 font-black text-white text-xs hover:bg-orange-600 flex items-center gap-2 mx-auto">
              <Search className="w-4 h-4" /> Selecionar grupos
            </button>
          </div>

          <div className="space-y-2">
            {groups.map(group => (
              <div key={group.id} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100">
                      <Users className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">{group.name}</p>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${group.status === 'healthy' ? 'bg-green-100 text-green-700' : group.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {group.status === 'healthy' ? 'Saudável' : group.status === 'active' ? 'Ativo' : 'Novo'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">{group.memberCount} membros</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1 text-slate-500"><Send className="w-3 h-3" /> {group.messagesSent30d} em 30d</div>
                    <div className="flex items-center gap-1 text-slate-500"><ArrowDown className="w-3 h-3" /> {group.messagesReceived30d} em 30d</div>
                    <span className="text-slate-600">Enviadas: {group.messagesSent30d}</span>
                    <span className="text-slate-500">{group.lastActivity ? `Última atividade: ${new Date(group.lastActivity).toLocaleDateString('pt-BR')}` : 'Sem envios ainda'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'protecao' && (
        <div className="text-center py-12 px-4 text-xs text-slate-500">
          <Shield className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-700">Proteção de grupos</p>
          <p className="mt-1">Em breve: anti-spam, limite de mensagens, palavras bloqueadas</p>
        </div>
      )}

      {activeTab === 'campanhas' && (
        <div className="text-center py-12 px-4 text-xs text-slate-500">
          <Send className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-700">Campanhas automáticas</p>
          <p className="mt-1">Em breve: agendamento recorrente, sequências, A/B testing</p>
        </div>
      )}
    </section>
  );
};

export default GruposPage;