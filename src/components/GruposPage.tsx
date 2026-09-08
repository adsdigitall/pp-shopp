import React, { useState } from 'react';
import { Users, Shield, Send, Search, Plus, Trash2, Check, X, AlertTriangle, Circle, CircleDot, BarChart2, Activity, ArrowDown } from 'lucide-react';
import { Group } from '../types/product';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/ScrollArea';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';

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
    <section id="grupos" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-black text-[var(--text-primary)]">Meus Grupos</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Acompanhe a saúde dos seus grupos e mantenha eles limpos.</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="default" onClick={onSelectGroups} className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">
              <Plus className="w-4 h-4" /> Selecionar grupos
            </Button>
          </TooltipTrigger>
          <TooltipContent>Selecione os grupos desejados</TooltipContent>
        </Tooltip>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <ScrollArea className="w-full">
          <div className="flex gap-2 mb-4 overflow-x-auto">
            <TabsList className="flex gap-2">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5 bg-[var(--surface-elevated)] text-[var(--text-secondary)] data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white"
                >
                  {tab.icon} {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <TabsContent value="monitor" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[var(--surface-elevated)] p-3">
              <p className="text-xs text-[var(--text-secondary)]">Grupos ativos</p>
              <b className="block text-lg text-[var(--text-primary)]">{groups.filter(g => g.status === 'active' || g.status === 'healthy').length}</b>
            </div>
            <div className="rounded-xl bg-[var(--surface-elevated)] p-3">
              <p className="text-xs text-[var(--text-secondary)]">Membros alcançados</p>
              <b className="block text-lg text-[var(--text-primary)]">{groups.reduce((sum, g) => sum + g.memberCount, 0)}</b>
            </div>
            <div className="rounded-xl bg-[var(--surface-elevated)] p-3">
              <p className="text-xs text-[var(--text-secondary)]">Mensagens enviadas</p>
              <b className="block text-lg text-[var(--text-primary)]">{groups.reduce((sum, g) => sum + g.messagesSent30d, 0)}</b>
            </div>
          </div>

          <Card className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-xs text-[var(--text-secondary)]">Escolha quais grupos do seu WhatsApp aparecem em Meus Grupos.</p>
            <Button variant="default" onClick={onSelectGroups} className="mt-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] mx-auto flex items-center gap-2 px-3 py-2 font-black text-xs">
              <Search className="w-4 h-4" /> Selecionar grupos
            </Button>
          </Card>

          <div className="space-y-2">
            {groups.map(group => (
              <Card key={group.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-elevated)]">
                      <Users className="w-5 h-5 text-[var(--text-secondary)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[var(--text-primary)]">{group.name}</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={group.status === 'healthy' ? 'success' : group.status === 'active' ? 'default' : 'secondary'}>
                              {group.status === 'healthy' ? 'Saudável' : group.status === 'active' ? 'Ativo' : 'Novo'}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{group.status}</TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)]">{group.memberCount} membros</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]"><Send className="w-3 h-3" /> {group.messagesSent30d} em 30d</div>
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]"><ArrowDown className="w-3 h-3" /> {group.messagesReceived30d} em 30d</div>
                    <span className="text-[var(--text-secondary)]">Enviadas: {group.messagesSent30d}</span>
                    <span className="text-[var(--text-secondary)]">{group.lastActivity ? `Última atividade: ${new Date(group.lastActivity).toLocaleDateString('pt-BR')}` : 'Sem envios ainda'}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="protecao" className="text-center py-12 px-4 text-xs text-[var(--text-secondary)]">
          <Shield className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-[var(--text-primary)]">Proteção de grupos</p>
          <p className="mt-1">Em breve: anti-spam, limite de mensagens, palavras bloqueadas</p>
        </TabsContent>

        <TabsContent value="campanhas" className="text-center py-12 px-4 text-xs text-[var(--text-secondary)]">
          <Send className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-[var(--text-primary)]">Campanhas automáticas</p>
          <p className="mt-1">Em breve: agendamento recorrente, sequências, A/B testing</p>
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default GruposPage;
