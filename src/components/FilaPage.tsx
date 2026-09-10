import React, { useEffect, useState } from 'react';
import { Product, QueueItem, Group } from '../types/product';
import { ProductCard } from './ProductCard';
import { Trash2, Copy, CheckSquare, Square, Link as LinkIcon, Boxes, Users, Send, Zap, Clock, Save, Search, Check, X, AlertTriangle, Circle, CircleDot, BarChart2, Activity, ArrowDown, RotateCcw, RotateCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Switch } from '@/components/ui/Switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { Checkbox } from '@/components/ui/Checkbox';

const PRIORITIZED_AUTOMATION_CATEGORIES = [
  { id: 'casa e cozinha', label: 'Casa e cozinha (50%)' },
  { id: 'beleza', label: 'Beleza e autocuidado (20%)' },
  { id: 'organizadores', label: 'Organização (15%)' },
  { id: 'moda feminina barata', label: 'Moda feminina barata (10%)' },
  { id: 'utilidades domésticas', label: 'Utilidades do dia a dia (5%)' },
  { id: 'maternidade e infantil', label: 'Maternidade e infantil' },
  { id: 'cama mesa e banho', label: 'Cama, mesa e banho' },
  { id: 'banheiro', label: 'Banheiro' },
  { id: 'acessórios femininos', label: 'Acessórios femininos' },
  { id: 'eletrônicos baratos', label: 'Eletrônicos baratos' },
];

interface FilaPageProps {
  queueItems: QueueItem[];
  groups: Group[];
  onAddToQueue: () => void;
  onRemoveFromQueue: (queueId: string) => void;
  onClearQueue: () => void;
  onSelectAll: (selected: boolean) => void;
  onToggleSelection: (queueId: string) => void;
  onOpenDispatch: () => void;
  onOpenGroups: () => void;
  showToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const FilaPage: React.FC<FilaPageProps> = ({
  queueItems,
  groups,
  onAddToQueue,
  onRemoveFromQueue,
  onClearQueue,
  onSelectAll,
  onToggleSelection,
  onOpenDispatch,
  onOpenGroups,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'fila' | 'grupos' | 'automacao'>('fila');
  const [automation, setAutomation] = useState<any>({ enabled: false, groups: [], interval: { value: 7, unit: 'minutes' }, offerInterval: { value: 7, unit: 'minutes' }, activeFrom: '08:00', activeUntil: '23:00' });
  const [savingAutomation, setSavingAutomation] = useState(false);

  useEffect(() => {
    fetch('/api/dispatch/automation', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(body => {
      if (body?.config) setAutomation(body.config);
    }).catch(() => undefined);
  }, []);

  const selectedAutomationIds = Array.isArray(automation.groups) ? automation.groups.map((group: any) => String(group.id)) : [];
  const selectedAutomationCategoryIds = Array.isArray(automation.categories) ? automation.categories.map(String) : [];

  const getAutomationCapacity = () => {
    const value = Math.max(1, Number(automation.offerInterval?.value || automation.interval?.value) || 30);
    const unit = automation.offerInterval?.unit || automation.interval?.unit || 'seconds';
    const intervalMinutes = unit === 'hours' ? value * 60 : unit === 'minutes' ? value : value / 60;
    const parseTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time || '') ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : null;
    const from = parseTime(automation.activeFrom || '');
    const until = parseTime(automation.activeUntil || '');
    const duration = from === null || until === null || from === until ? 1440 : (until - from + 1440) % 1440;
    return Math.floor(duration / intervalMinutes) + 1;
  };
  
  const automationCapacity = getAutomationCapacity();

  const saveAutomation = async () => {
    setSavingAutomation(true);
    try {
      const response = await fetch('/api/dispatch/automation', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: automation.enabled, groupIds: selectedAutomationIds, categoryIds: selectedAutomationCategoryIds, interval: automation.interval, offerInterval: automation.offerInterval || automation.interval, aiEnabled: automation.aiEnabled === true, activeFrom: automation.activeFrom || '08:00', activeUntil: automation.activeUntil || '23:00', scheduleSlots: automation.scheduleSlots }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message || 'Não foi possível salvar.');
      setAutomation(body.config);
      showToast(automation.enabled ? 'Automação ativada' : 'Automação pausada', automation.enabled ? 'As próximas ofertas adicionadas à fila serão disparadas com esta configuração.' : undefined, 'success');
    } catch (error) {
      showToast('Erro na automação', error instanceof Error ? error.message : 'Tente novamente.', 'error');
    } finally { setSavingAutomation(false); }
  };

  const selectedCount = queueItems.filter(item => item.selected).length;
  const isCompleteOffer = (item: QueueItem) => Boolean(item.product.name?.trim())
    && Number.isFinite(Number(item.product.currentPrice))
    && Number(item.product.currentPrice) > 0
    && /^https?:\/\/\S+$/i.test(String(item.product.affiliateUrl || ''));
  const readyItems = queueItems.filter(isCompleteOffer);
  const incompleteItems = queueItems.filter(item => !isCompleteOffer(item));
  const selectedAll = readyItems.length > 0 && selectedCount === readyItems.length;

  const handleToggleSelectAll = () => {
    onSelectAll(!selectedAll);
  };

  const copyAffiliateLink = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Link copiado', 'Link de afiliado copiado.', 'success');
  };

  return (
    <section id="ofertas-fila" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">Ofertas</h2>
              <p className="text-xs text-muted-foreground">{readyItems.length} ofertas completas para revisar e disparar.</p>
            </div>
          </div>
        </div>
        <Button onClick={onOpenDispatch} className="mt-2 sm:mt-0 gap-1.5">
          <Send className="h-3.5 w-3.5" /> Disparar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v: 'fila' | 'grupos' | 'automacao') => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fila">Fila</TabsTrigger>
          <TabsTrigger value="automacao">Automação</TabsTrigger>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
        </TabsList>

        <TabsContent value="fila" className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <Button variant="outline" onClick={onAddToQueue} className="gap-1.5">
              <span className="text-lg">+</span> Adicionar
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleToggleSelectAll} className="gap-1">
                {selectedAll ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
                Todos
              </Button>
              <Button variant="destructive" size="sm" onClick={onClearQueue} className="gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Limpar
              </Button>
            </div>
          </div>

          {incompleteItems.length > 0 && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="min-w-0">
                <p className="text-xs font-bold">{incompleteItems.length} registros antigos incompletos foram bloqueados</p>
                <p className="mt-0.5 text-[10px] leading-4 text-amber-100/70">Eles não têm nome, preço ou link válidos e não serão enviados. Use “Limpar” para removê-los e deixe a automação criar novas ofertas completas.</p>
              </div>
            </div>
          )}

          {readyItems.length === 0 ? (
            <Card className="pressable-card">
              <CardContent className="p-6 text-center">
                <Boxes className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-semibold text-foreground">Nenhuma oferta completa na fila</p>
                <p className="mt-1 text-xs text-muted-foreground">Garimpe uma oferta ou aguarde o próximo ciclo automático.</p>
                <Button onClick={onAddToQueue} className="mt-4">Garimpar ofertas</Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[64vh] pr-2 scrollbar-thin">
              <div className="grid gap-3 xl:grid-cols-2">
              {readyItems.map((item) => (
                <Card key={item.id} className="pressable-card overflow-hidden border-white/[0.07] bg-card/80">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => onToggleSelection(item.id)}
                        className="mt-1 h-5 w-5 shrink-0"
                      />
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-24">
                        {item.product.imageUrl ? <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><LinkIcon className="h-5 w-5" /></div>}
                        {item.product.discountPercentage != null && item.product.discountPercentage > 0 && (
                          <Badge className="absolute left-1.5 top-1.5 border-0 bg-primary px-1.5 py-0.5 text-[9px] text-white">-{Math.round(item.product.discountPercentage)}%</Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-2 text-sm font-bold leading-5 text-foreground">{item.product.name}</p>
                          <Button variant="ghost" size="icon-sm" onClick={() => onRemoveFromQueue(item.id)} className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-destructive" aria-label="Remover oferta">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <span className="text-base font-black text-success">R$ {item.product.currentPrice?.toFixed(2).replace('.', ',')}</span>
                          {item.product.originalPrice && <span className="text-[10px] line-through text-muted-foreground">R$ {item.product.originalPrice.toFixed(2).replace('.', ',')}</span>}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Badge variant={item.product.marketplace === 'mercado_livre' ? 'secondary' : 'default'}>
                            {item.product.marketplace === 'shopee' ? 'SH' : item.product.marketplace === 'mercado_livre' ? 'ML' : item.product.marketplace}
                          </Badge>
                          {item.product.salesCount != null && <span>+{item.product.salesCount.toLocaleString('pt-BR')} vendidos</span>}
                          {item.product.salesCountText && item.product.salesCount == null && <span>{item.product.salesCountText} vendidos</span>}
                          {item.product.rating != null && <span>★ {item.product.rating.toFixed(1)}</span>}
                        </div>
                        <div className="mt-2 flex min-w-0 items-center gap-1 rounded-lg bg-muted/70 p-1 pl-2 text-[9px]">
                          <LinkIcon className="h-3 w-3 shrink-0 text-primary" />
                          <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{item.product.affiliateUrl}</span>
                          <Button variant="ghost" size="icon-sm" onClick={() => copyAffiliateLink(item.product.affiliateUrl)} aria-label="Copiar link de afiliado">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </ScrollArea>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-primary/10 p-2">
              <b className="block text-lg text-primary">{readyItems.length}</b>
              <span className="text-[9px] text-primary">prontas</span>
            </div>
            <div className="rounded-lg bg-success/10 p-2">
              <b className="block text-lg text-success">0</b>
              <span className="text-[9px] text-success">disparadas</span>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <b className="block text-lg text-muted-foreground">Manual</b>
              <span className="text-[9px] text-muted-foreground">modo seguro</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automacao" className="mt-4 space-y-4">
          <Card className="pressable-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${automation.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Fila automática</CardTitle>
                  <CardDescription>Salve grupos e intervalo uma vez.</CardDescription>
                </div>
              </div>
              <Switch checked={automation.enabled === true} onCheckedChange={(checked) => setAutomation((prev: any) => ({ ...prev, enabled: checked }))} aria-label="Ativar envio automático" />
            </CardHeader>
            
            {automation.enabled && (
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-3">
                  <div className="rounded-lg border border-border bg-muted p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Filtro por IA</p>
                        <p className="mt-0.5 text-[9px] leading-3 text-muted-foreground">A IA só aprova ofertas com dados reais relevantes. Sem aprovação, a oferta continua na fila manual.</p>
                      </div>
                      <Switch checked={automation.aiEnabled === true} onCheckedChange={(checked) => setAutomation((prev: any) => ({ ...prev, aiEnabled: checked }))} aria-label="Ativar filtro por IA" />
                    </div>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Começar a enviar</label>
                      <Input type="time" value={automation.activeFrom || ''} onChange={e => setAutomation((prev: any) => ({ ...prev, activeFrom: e.target.value }))} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Parar de enviar</label>
                      <Input type="time" value={automation.activeUntil || ''} onChange={e => setAutomation((prev: any) => ({ ...prev, activeUntil: e.target.value }))} className="h-8" />
                    </div>
                    <p className="sm:col-span-2 text-[9px] leading-3 text-muted-foreground">Deixe os dois horários vazios para enviar o dia todo. Fora do horário, a oferta fica na fila manual.</p>
                    
                    <div className="sm:col-span-2 space-y-1">
                      <label className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">Nova oferta a cada
                        <Input type="number" min="1" value={automation.offerInterval?.value || automation.interval?.value || 30} onChange={e => setAutomation((prev: any) => ({ ...prev, offerInterval: { ...(prev.offerInterval || prev.interval || {}), value: Number(e.target.value) } }))} className="h-7 w-14" />
                        <Select value={automation.offerInterval?.unit || automation.interval?.unit || 'seconds'} onValueChange={e => setAutomation((prev: any) => ({ ...prev, offerInterval: { ...(prev.offerInterval || prev.interval || {}), unit: e } }))}>
                          <SelectTrigger className="h-7"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="seconds">segundos</SelectItem>
                            <SelectItem value="minutes">minutos</SelectItem>
                            <SelectItem value="hours">horas</SelectItem>
                          </SelectContent>
                        </Select>
                      </label>
                    </div>
                    
                    <div className="sm:col-span-2 rounded-md border border-border bg-muted p-2 space-y-2">
                      <p className="text-xs font-semibold text-foreground">Categorias que o piloto automático pode buscar</p>
                      <ScrollArea className="flex flex-wrap gap-1.5">
                        {PRIORITIZED_AUTOMATION_CATEGORIES.map(category => { 
                          const checked = selectedAutomationCategoryIds.includes(category.id); 
                          return (
                            <Button key={category.id} type="button" variant={checked ? 'default' : 'outline'} size="sm" onClick={() => setAutomation((prev: any) => ({ ...prev, categories: checked ? prev.categories.filter((item: string) => item !== category.id) : [...(prev.categories || []), category.id] }))}>
                              {checked && '✓ '}{category.label}
                            </Button>
                          );
                        })}
                      </ScrollArea>
                      <p className="mt-1.5 text-[8px] text-muted-foreground">Sem categoria marcada, busca ofertas em alta de todos os nichos.</p>
                    </div>
                    
                    <p className="sm:col-span-2 rounded-md bg-primary/10 p-2 text-[10px] font-semibold text-foreground">Previsão: até {automationCapacity} {automationCapacity === 1 ? 'oferta' : 'ofertas'} neste período, contando a primeira no horário de início.</p>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">Grupos que receberão as próximas ofertas</p>
                    <ScrollArea className="grid gap-1.5 sm:grid-cols-2 max-h-40">
                      {groups.map(group => { 
                        const checked = selectedAutomationIds.includes(String(group.id)); 
                        return (
                          <Button key={group.id} type="button" variant={checked ? 'default' : 'outline'} className="flex items-center gap-2 justify-start text-left" onClick={() => setAutomation((prev: any) => ({ ...prev, groups: checked ? prev.groups.filter((item: any) => String(item.id) !== String(group.id)) : [...prev.groups, { id: group.id, name: group.name, sessionId: (group as any).sessionId }] }))}>
                            <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${checked ? 'border-white bg-white/25 text-white' : 'border-current opacity-50'}`}>
                              {checked && <Check className="h-3 w-3" />}
                            </span>
                            <span className="truncate">{group.name}</span>
                          </Button>
                        );
                      })}
                    </ScrollArea>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <Input type="number" min="10" value={automation.interval?.value || 30} onChange={e => setAutomation((prev: any) => ({ ...prev, interval: { ...(prev.interval || {}), value: Number(e.target.value) } }))} className="h-8 w-16" />
                      <Select value={automation.interval?.unit || 'seconds'} onValueChange={e => setAutomation((prev: any) => ({ ...prev, interval: { ...(prev.interval || {}), unit: e } }))}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seconds">segundos</SelectItem>
                          <SelectItem value="minutes">minutos</SelectItem>
                          <SelectItem value="hours">horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button variant="outline" onClick={saveAutomation} disabled={savingAutomation} className="w-full sm:w-auto">
                      {savingAutomation ? 'Salvando...' : automation.enabled ? 'Atualizar automação' : 'Salvar automação'}
                    </Button>
                  </div>
                </div>
                </CardContent>
              )}
          </Card>
        </TabsContent>

        <TabsContent value="grupos" className="mt-4">
          <Card className="pressable-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple/10 text-purple">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Meus Grupos</CardTitle>
                  <CardDescription>Gerencie os grupos que vão receber seus disparos.</CardDescription>
                </div>
              </div>
              <Button size="sm" onClick={onOpenGroups} className="gap-1.5">
                <Search className="w-3.5 h-3.5" /> Selecionar grupos
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-lg bg-muted p-2">
                  <b className="block text-lg text-foreground">2</b>
                  <span className="text-[9px] text-muted-foreground">Grupos ativos</span>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <b className="block text-lg text-foreground">5</b>
                  <span className="text-[9px] text-muted-foreground">Membros</span>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <b className="block text-lg text-foreground">4</b>
                  <span className="text-[9px] text-muted-foreground">Enviadas</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default FilaPage;
