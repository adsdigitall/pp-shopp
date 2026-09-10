import React from 'react';
import { Download, Copy, Check, X, AlertCircle, Shield, Globe, Smartphone, Zap, ShoppingBag, Sun, Moon, Star, Gift, TrendingUp, Lock, Key, Code, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ExtensaoPageProps {
  extensionToken: string;
  panelUrl: string;
  onRotateToken: () => void;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const ExtensaoPage: React.FC<ExtensaoPageProps> = ({
  extensionToken,
  panelUrl,
  onRotateToken,
  onShowToast,
}) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(`${label} copiado`, 'Pronto para colar no popup da extensão.', 'success');
  };

  const Folder = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-1-1H5a2 2 0 00-2 2z"/></svg>;

  const steps = [
    { number: 1, title: 'Baixe e descompacte', description: 'Baixe o .zip acima e descompacte numa pasta que você não vá apagar (a extensão roda a partir dela).', icon: <Download className="w-5 h-5" /> },
    { number: 2, title: 'Abra as extensões do Chrome', description: 'Cole o endereço abaixo na barra do Chrome. Ele não deixa clicar num link que leve pra lá.', icon: <ExternalLink className="w-5 h-5" />, code: 'chrome://extensions', copyLabel: 'Copiar' },
    { number: 3, title: 'Ligue o Modo do desenvolvedor', description: 'É a chavinha no canto superior direito da página de extensões.', icon: <Smartphone className="w-5 h-5" /> },
    { number: 4, title: 'Clique em "Carregar sem compactação"', description: 'Selecione a pasta que você descompactou no passo 1.', icon: <Folder /> },
    { number: 5, title: 'Pronto!', description: 'Abra uma loja (Shopee, Amazon, Mercado Livre ou Magalu), clique em "Garimpar esta página" no widget, e os produtos caem direto na sua Fila — já com link de afiliado, foto, nome e preço.', icon: <CheckCircle2 className="w-5 h-5" /> },
  ];

  const platformRequirements = [
    { platform: 'Mercado Livre', icon: <ShoppingBag className="w-5 h-5" />, description: 'Esteja logado na sua conta de afiliado e sincronize a sessão (cookies) pelo popup, além de configurar sua etiqueta.', link: '/#configuracoes', linkText: 'Configurar' },
    { platform: 'Amazon', icon: <Globe className="w-5 h-5" />, description: 'Configure sua Associate tag (ex.: suatag-20).', link: '/#configuracoes', linkText: 'Configurar' },
    { platform: 'Magalu', icon: <Gift className="w-5 h-5" />, description: 'Configure o slug da sua loja (Magazine Você).', link: '/#configuracoes', linkText: 'Configurar' },
    { platform: 'Shopee', icon: <Zap className="w-5 h-5" />, description: 'A extensão copia os títulos — cole na busca do Garimpar, que traz tudo com seu link. Nada a configurar no popup.', link: '/#garimpar', linkText: 'Abrir Garimpar' },
  ];

  const todayLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Garimpo em 1 clique</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--foreground)]">Extensão do Radar de Oferta</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">Garimphe páginas inteiras de Shopee, Amazon, Mercado Livre e Magalu com um clique. No Mercado Livre, Amazon e Magalu a extensão extrai os produtos e envia direto pra sua Fila, já com link de afiliado, foto, nome e preço. Na Shopee ela copia os títulos da página pra você colar na busca do Garimpar, que traz os produtos com seu link de afiliado.</p>
        </div>
        <span className="shrink-0 text-xs text-[var(--text-secondary)]">{todayLabel}</span>
      </div>

      <div className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-[var(--primary)]/10">
            <Download className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <p className="font-black text-[var(--foreground)]">Extensão do Radar de Oferta Connect</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">A extensão que garimpa a loja aberta num clique — direto pra Fila no Mercado Livre, Amazon e Magalu; por títulos na Shopee.</p>
          </div>
        </div>
        <Button variant="default" className="btn-brand inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black text-white" asChild>
          <a href="/radar-oferta-connect-v1.zip" download>Baixar extensão (.zip)</a>
        </Button>
      </div>

      <div className="panel border-[var(--warning)]/30 p-4">
        <h3 className="font-bold text-[var(--foreground)]">Você precisa ser afiliado das plataformas</h3>
        <p className="mb-3 mt-1 text-xs text-[var(--text-secondary)]">A extensão gera o link de afiliado no seu navegador. Pra isso funcionar, você precisa ser afiliado de verdade em cada loja:</p>
        <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
          <li className="flex items-start gap-2"><span className="text-[var(--warning)]">●</span> <span><strong>Mercado Livre:</strong> é preciso estar <strong>logado na sua conta de afiliado</strong>. Sem isso, o link não é gerado.</span></li>
          <li className="flex items-start gap-2"><span className="text-[var(--warning)]">●</span> <span><strong>Amazon e Magalu:</strong> configure sua etiqueta/slug no app e seja afiliado de verdade pra ganhar comissão.</span></li>
        </ul>
      </div>

      <div className="panel p-5">
        <p className="eyebrow">Instalação</p>
        <h2 className="mt-1 text-base font-black text-[var(--foreground)]">Instalar em 5 passos</h2>
        <div className="mt-4 space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[var(--primary)]/10 font-black text-sm text-[var(--primary)]">{step.number}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--surface-elevated)] text-[var(--text-secondary)]">{step.icon}</span>
                  <span className="font-bold text-[var(--foreground)]">{step.title}</span>
                </div>
                <p className="ml-10 mt-1 text-xs text-[var(--text-secondary)]">{step.description}</p>
                {step.code && (
                  <div className="ml-10 mt-2 flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 font-mono text-[11px] text-[var(--foreground)]">{step.code}</code>
                    <Button onClick={() => copyToClipboard(step.code!, step.copyLabel || 'Código')} className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-[11px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-hover)]">{step.copyLabel}</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--warning)]/10">
              <Key className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div>
              <p className="font-black text-[var(--foreground)]">Seu token</p>
              <p className="text-xs text-[var(--text-secondary)]">É a autenticação da sua conta — vale pra todas as lojas. Cole no campo "Token" do popup. Se vazar, gere outro.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-2 font-mono text-[11px] text-[var(--foreground)]">{extensionToken || 'Gerando token…'}</code>
            <div className="flex shrink-0 gap-2">
              <Button onClick={() => extensionToken && copyToClipboard(extensionToken, 'Token')} className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-[11px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-hover)]"><Copy className="mr-1 h-3 w-3" /> Copiar</Button>
              <Button onClick={onRotateToken} className="btn-amber-outline rounded-lg px-3 py-1.5 text-[11px] font-bold">Gerar novo</Button>
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)]/10">
              <Globe className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="font-black text-[var(--foreground)]">URL do painel</p>
              <p className="text-xs text-[var(--text-secondary)]">Cole no campo "URL do painel" do popup. É pra onde a extensão manda os produtos — se estiver errada, ela não fala com o app.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-2 font-mono text-[11px] text-[var(--foreground)]">{panelUrl}</code>
            <Button onClick={() => copyToClipboard(panelUrl, 'URL do painel')} className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-[11px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-hover)]"><Copy className="mr-1 h-3 w-3" /> Copiar</Button>
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <p className="eyebrow">Pré-requisitos</p>
        <h3 className="mt-1 font-black text-[var(--foreground)]">O que cada loja exige</h3>
        <p className="mb-3 mt-1 text-xs text-[var(--text-secondary)]">Pra gerar o link de afiliado, cada plataforma precisa de um ajuste. Configure na aba Garimpar da loja ou em Configurações.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {platformRequirements.map((req, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--warning)]/10 text-[var(--warning)]">{req.icon}</span>
                <span className="font-bold text-[var(--foreground)]">{req.platform}</span>
              </div>
              <p className="mb-2 text-xs text-[var(--text-secondary)]">{req.description}</p>
              <a href={req.link} className="flex items-center gap-1 text-xs font-bold text-[var(--warning)] hover:underline">{req.linkText} <ExternalLink className="h-3 w-3" /></a>
            </div>
          ))}
        </div>
      </div>

      <div className="panel border-[var(--success)]/30 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--success)]/10">
            <Shield className="h-5 w-5 text-[var(--success)]" />
          </div>
          <div>
            <p className="font-bold text-[var(--foreground)]">Seguro por padrão</p>
            <p className="text-xs text-[var(--text-secondary)]">A extensão só lê a página que você abrir, pra extrair os produtos. Não acessa sua conta nem envia nada sem você mandar. Não compartilhe seu token.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtensaoPage;
