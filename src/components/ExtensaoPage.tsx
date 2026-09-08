import React from 'react';
import { Download, Copy, Check, X, AlertCircle, Shield, Globe, Smartphone, Zap, ShoppingBag, Sun, Moon, Star, Gift, TrendingUp, Lock, Key, Code, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ExtensaoPageProps {
  extensionToken: string;
  panelUrl: string;
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

export const ExtensaoPage: React.FC<ExtensaoPageProps> = ({
  extensionToken,
  panelUrl,
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
    { platform: 'Mercado Livre', icon: <ShoppingBag className="w-5 h-5" />, description: 'Sincronize a sessão (cookies) pelo popup e configure sua etiqueta de afiliado.', link: '/garimpar', linkText: 'Configurar' },
    { platform: 'Amazon', icon: <Globe className="w-5 h-5" />, description: 'Configure sua Associate tag (ex.: suatag-20).', link: '/garimpar', linkText: 'Configurar' },
    { platform: 'Magalu', icon: <Gift className="w-5 h-5" />, description: 'Configure o slug da sua loja (Magazine Você).', link: '/garimpar', linkText: 'Configurar' },
    { platform: 'Shopee', icon: <Zap className="w-5 h-5" />, description: 'Usa a sua conexão Shopee no app (server-side). Nada a configurar no popup.', link: '/configuracoes', linkText: 'Configurar' },
  ];

  return (
    <section id="extensao" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-base font-black text-[var(--text-primary)]">Extensão do Radar de Oferta</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Garimphe páginas inteiras de Shopee, Amazon, Mercado Livre e Magalu com um clique. No Mercado Livre, Amazon e Magalu a extensão extrai os produtos e envia direto pra sua Fila, já com link de afiliado, foto, nome e preço. Na Shopee ela copia os links da página pra você colar em Garimpar › Por links, e o próprio GarimpaLinks busca os dados na loja.</p>
        </div>
<Button variant="default" className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[var(--primary-hover)]" asChild>
            <a href="/radar-oferta-connect-v1.zip" download>Baixar extensão (.zip)</a>
          </Button>
      </div>

      <div className="flex items-start gap-3 mb-6">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--surface-elevated)] flex-shrink-0">
          <Smartphone className="w-6 h-6 text-[var(--text-secondary)]" />
        </div>
        <div>
          <p className="font-bold text-[var(--text-primary)]">Extensão do GarimpaLinks Connect</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">A extensão que garimpa a loja aberta num clique — direto pra Fila no Mercado Livre, Amazon e Magalu; por links na Shopee.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-6">
        <h3 className="font-bold text-[var(--text-primary)] mb-3">Você precisa ser afiliado das plataformas</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-3">A extensão gera o link de afiliado no seu navegador. Pra isso funcionar, você precisa ser afiliado de verdade em cada loja:</p>
        <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
          <li className="flex items-start gap-2"><span className="text-[var(--warning)]">●</span> <strong>Mercado Livre:</strong> é preciso estar <strong>logado na sua conta de afiliado</strong>. Sem isso, o link não é gerado.</li>
          <li className="flex items-start gap-2"><span className="text-[var(--warning)]">●</span> <strong>Amazon e Magalu:</strong> configure sua etiqueta/slug no app e seja afiliado de verdade pra ganhar comissão.</li>
        </ul>
      </div>

      <div className="space-y-4 mb-6">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex-shrink-0 grid h-10 w-10 place-items-center rounded-xl bg-[var(--warning)]/10 text-[var(--warning)] font-black text-sm">{step.number}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--surface-elevated)]">{step.icon}</span>
                <span className="font-bold text-[var(--text-primary)]">{step.title}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)] ml-10">{step.description}</p>
              {step.code && (
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded bg-[var(--surface-elevated)] px-2 py-1 text-[10px] font-mono text-[var(--text-primary)] flex-1">{step.code}</code>
                  <Button onClick={() => copyToClipboard(step.code, step.copyLabel || 'Código')} className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">{step.copyLabel}</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--warning)]/10">
            <Key className="w-5 h-5 text-[var(--warning)]" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">Conecte a extensão</p>
            <p className="text-xs text-[var(--text-secondary)]">No popup da extensão, preencha os dois campos abaixo. É o que liga a extensão à sua conta.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--surface-elevated)]"><Key className="w-4 h-4 text-[var(--text-secondary)]" /></span>
              <span className="font-bold text-[var(--text-primary)]">Seu token</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-1 ml-10">É a autenticação da sua conta — vale pra todas as lojas. Cole no campo "Token" do popup.</p>
            <div className="flex items-center gap-2 ml-10">
              <code className="flex-1 rounded bg-[var(--surface-elevated)] px-2 py-1.5 text-[10px] font-mono text-[var(--text-primary)]">{extensionToken}</code>
              <Button onClick={() => copyToClipboard(extensionToken, 'Token')} className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"><Copy className="w-3 h-3 mr-1" /> Copiar</Button>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--surface-elevated)]"><Globe className="w-4 h-4 text-[var(--text-secondary)]" /></span>
              <span className="font-bold text-[var(--text-primary)]">URL do painel</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-1 ml-10">Cole no campo "URL do painel" do popup. É pra onde a extensão manda os produtos — se estiver errada, ela não fala com o app.</p>
            <div className="flex items-center gap-2 ml-10">
              <code className="flex-1 rounded bg-[var(--surface-elevated)] px-2 py-1.5 text-[10px] font-mono text-[var(--text-primary)]">{panelUrl}</code>
              <Button onClick={() => copyToClipboard(panelUrl, 'URL do painel')} className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"><Copy className="w-3 h-3 mr-1" /> Copiar</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-6">
        <h3 className="font-bold text-[var(--text-primary)] mb-1">O que cada loja exige</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-3">Pra gerar o link de afiliado, cada plataforma precisa de um ajuste. Configure na aba Garimpar da loja ou em Configurações.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {platformRequirements.map((req, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--warning)]/10">{req.icon}</span>
                <span className="font-bold text-[var(--text-primary)]">{req.platform}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-2">{req.description}</p>
              <a href={req.link} className="text-xs font-bold text-[var(--warning)] hover:underline flex items-center gap-1">{req.linkText} <ExternalLink className="w-3 h-3" /></a>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--success)]/10">
            <Shield className="w-5 h-5 text-[var(--success)]" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">Seguro por padrão</p>
            <p className="text-xs text-[var(--text-secondary)]">A extensão só lê a página que você abrir, pra extrair os produtos. Não acessa sua conta nem envia nada sem você mandar. Não compartilhe seu token.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExtensaoPage;