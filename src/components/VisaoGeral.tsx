import React from 'react';
import { ArrowRight, BarChart3, CalendarDays, Clock3, Layers3, Link2, Send, Settings, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface VisaoGeralProps {
  onNavigateToGarimpar: () => void;
  onNavigateToDispatch: () => void;
  onNavigateToGroups?: () => void;
  onNavigateToQueue?: () => void;
  queuedCount: number;
  dispatchCount: number;
  groupsCount: number;
  clicksCount: number;
  whatsappConnected: boolean;
  shopeeConfigured: boolean;
  latestDispatch?: { status?: string; createdAt?: string };
}

const WhatsAppIcon = ({ connected }: { connected: boolean }) => (
  connected ? (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403c-.109-.063-.597-.366-.72-.408-.133-.05-.272-.095-.422-.082-.16.013-.312.045-.471.078-.154.03-.299.054-.45.07-.15.017-.305.015-.462-.014-.163-.03-.32-.07-.478-.108-.14-.03-.283-.04-.426-.03-.143.01-.279.03-.418.054-.247.05-.399.046-.531-.014-.14-.054-.433-.238-.753-.573-.318-.333-.592-.602-.846-.865-.272-.28-.51-.532-.762-.772-.28-.264-.54-.508-.79-.746-.25-.237-.47-.465-.68-.687-.22-.23-.43-.45-.61-.66-.18-.22-.34-.44-.48-.645-.14-.2-.27-.39-.38-.576-.11-.18-.21-.35-.3-.53-.09-.18-.17-.35-.24-.516-.07-.16-.13-.32-.18-.476-.05-.15-.08-.3-.11-.448-.03-.15-.05-.3-.06-.443-.01-.148 0-.303.005-.448.004-.144.02-.285.043-.427.058-.14.014-.277.02-.42.02-.142 0-.283-.013-.426-.027-.145-.015-.334-.04-.579-.075-.244-.035-.48-.06-.71-.09-.23-.03-.46-.04-.69-.04-.465 0-.856.07-1.15.253-.294.183-.536.453-.738.794-.203.34-.365.704-.47 1.078-.106.374-.162.754-.17 1.138-.009.388.03.78.08 1.17.05.385.125.767.225 1.14.09.37.2.738.328 1.09.13.355.29.706.466 1.05.18.34.37.674.58 1.00.2.33.42.64.66.93.25.29.51.57.79.83.28.27.56.52.85.76.29.25.58.49.87.72.29.23.57.44.86.64.29.2.58.39.87.58.29.19.57.37.86.55.29.18.57.34.85.5.28.16.55.31.82.46.27.15.54.29.8.42.26.13.52.25.78.36.26.11.51.21.76.3.25.09.5.17.74.24.24.07.47.13.7.18.23.05.45.1.67.13.22.03.43.05.64.06.21 0 .41-.01.62-.02.2-.01.4-.02.59-.03.19-.01.38-.02.57-.03.18-.01.36-.02.54-.03.17-.01.34-.02.51-.03.16-.01.32-.02.48-.03.15-.01.29-.01.44-.01.14 0 .27.01.4.01.13 0 .26.01.38.01.13 0 .25.01.37.02.12.01.24.02.35.03.11.01.21.02.31.03.1.01.19.02.28.03.09 0 .18.01.26.01.08 0 .16.01.24.01.08 0 .15.01.22.01.08 0 .14 0 .07 0 .13 0 .12 0 .06 0 .11 0 .1 0 .05 0 .09 0 .08 0 .04 0 .07 0 .07 0 .03 0 .06 0 .05 0 .02 0 .04 0 .03 0 .01 0 .02 0 .01 0" /></svg>
  ) : (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
  )
);

const ShopeeIcon = ({ configured }: { configured: boolean }) => (
  configured ? (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
  ) : (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
  )
);

const AutomationIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
);

interface VisaoGeralProps {
  onNavigateToGarimpar: () => void;
  onNavigateToDispatch: () => void;
  onNavigateToGroups?: () => void;
  onNavigateToQueue?: () => void;
  queuedCount: number;
  dispatchCount: number;
  groupsCount: number;
  clicksCount: number;
  whatsappConnected: boolean;
  shopeeConfigured: boolean;
  latestDispatch?: { status?: string; createdAt?: string };
}

export const VisaoGeral: React.FC<VisaoGeralProps> = ({ 
  onNavigateToGarimpar, 
  onNavigateToDispatch, 
  onNavigateToGroups = () => undefined, 
  onNavigateToQueue = () => undefined, 
  queuedCount, 
  dispatchCount, 
  groupsCount, 
  clicksCount, 
  whatsappConnected, 
  shopeeConfigured, 
  latestDispatch 
}) => {
  const metrics = [
    { label: 'Disparos hoje', value: dispatchCount, note: 'Registros de hoje', icon: Send, variant: 'default' as const },
    { label: 'Grupos sincronizados', value: groupsCount, note: 'Conta conectada', icon: Users, variant: 'success' as const },
    { label: 'Cliques no link', value: clicksCount, note: 'Rastreamento pendente', icon: Link2, variant: 'default' as const },
    { label: 'Ofertas na fila', value: queuedCount, note: 'Aguardando envio', icon: Layers3, variant: 'default' as const },
  ];
  
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date());

  return (
    <section id="visao-geral" className="space-y-4">
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-black leading-tight tracking-tight text-foreground">Bom dia <span aria-hidden="true">👋</span></h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Veja como está sua operação hoje.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {formattedDate}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon, variant }) => (
          <Card key={label} className="pressable-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              </div>
              <p className="mt-3 text-xs font-semibold text-muted-foreground truncate">{label}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <strong className="text-2xl font-black text-foreground">{value}</strong>
                {variant === 'success' && <Badge variant="success" className="ml-1">Conectado</Badge>}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground truncate">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button 
        onClick={onNavigateToDispatch} 
        size="lg" 
        className="w-full justify-start gap-3 shadow-[0_4px_14px_-2px_rgba(238,77,45,0.35)]"
      >
        <Send className="h-6 w-6 shrink-0" />
        <div className="text-left">
          <strong className="block text-base font-black">Disparar oferta</strong>
          <span className="block text-xs text-primary-foreground/80">Envie para seus grupos em segundos</span>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0" />
      </Button>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Garimpar', desc: 'Encontre produtos', icon: Settings, action: onNavigateToGarimpar },
          { label: 'Grupos', desc: 'Gerencie grupos', icon: Users, action: onNavigateToGroups },
          { label: 'Fila', desc: 'Acompanhe disparos', icon: Layers3, action: onNavigateToQueue },
        ].map(({ label, desc, icon: Icon, action }) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            onClick={action}
            className="h-auto min-h-[90px] p-3 text-left justify-start gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <strong className="block truncate text-sm font-black text-foreground">{label}</strong>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{desc}</span>
            </div>
          </Button>
        ))}
      </div>

      <Card className="pressable-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <BarChart3 className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Status da operação</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">Status atual <ArrowRight className="inline h-3 w-3" /></span>
        </CardHeader>
        
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${whatsappConnected ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              <WhatsAppIcon connected={whatsappConnected} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground">WhatsApp</p>
              <p className="text-[10px] text-muted-foreground">{whatsappConnected ? 'Conta conectada ao WAHA' : 'Nenhuma conta conectada'}</p>
            </div>
            <Badge variant={whatsappConnected ? 'success' : 'destructive'} className="text-[10px]">
              {whatsappConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${shopeeConfigured ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
              <ShopeeIcon configured={shopeeConfigured} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground">Shopee</p>
              <p className="text-[10px] text-muted-foreground">{shopeeConfigured ? 'Integração disponível' : 'Integração ainda não configurada'}</p>
            </div>
            <Badge variant={shopeeConfigured ? 'success' : 'secondary'} className="text-[10px]">
              {shopeeConfigured ? 'Ativa' : 'Pendente'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <AutomationIcon />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground">Envio automático</p>
              <p className="text-[10px] text-muted-foreground">Configure na aba Fila para disparos automáticos</p>
            </div>
            <Badge variant="secondary" className="text-[10px]">Parado</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="pressable-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock3 className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">Atividade recente</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">Ver todas <ArrowRight className="inline h-3 w-3" /></span>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Send className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground">
                {latestDispatch 
                  ? `Disparo ${latestDispatch.status === 'completed' ? 'concluído' : 'em processamento'}`
                  : 'Nenhum disparo registrado'
                }
              </p>
              <p className="text-[10px] text-muted-foreground">
                {latestDispatch?.createdAt 
                  ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(latestDispatch.createdAt))
                  : 'Assim que um disparo for criado, ele aparecerá aqui.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default VisaoGeral;