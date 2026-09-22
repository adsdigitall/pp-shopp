/** Estado da automação: por que está (ou não está) enviando agora. */

export interface AutomationStatus {
  status: 'desligada' | 'modo-manual' | 'sem-grupo' | 'aguardando-conexao' | 'fora-do-horario' | 'whatsapp-fora' | 'sem-oferta-aprovada' | 'aguardando-intervalo' | 'enviando';
  mensagem: string;
  ligada: boolean;
  dentroDoHorario: boolean;
  whatsappConectado: boolean;
  grupos: number;
  ofertasNaFila: number;
  ultimoEnvio: string | null;
  proximaEmMinutos: number;
  janela: { de: string; ate: string };
  comissaoMinima: number | null;
  ultimoGarimpo: null | {
    quando: string | null;
    categoria: string | null;
    vistas: number;
    aprovadas: number;
    repetidas: number;
    motivos: { motivo: string; quantas: number }[];
  };
}

/** Vermelho = parado por algo que precisa de ação; verde = trabalhando. */
export const statusPrecisaDeAcao = (status: AutomationStatus['status']) =>
  status === 'desligada' || status === 'sem-grupo' || status === 'whatsapp-fora' || status === 'modo-manual' || status === 'aguardando-conexao';

export async function fetchAutomationStatus(): Promise<AutomationStatus> {
  const response = await fetch('/api/dispatch/automation/status', { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível ler o estado da automação.');
  return response.json();
}

/** "há 3 min", "há 2 h" — para o último envio. */
export function desde(iso: string | null): string {
  if (!iso) return 'ainda não enviou';
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(minutos) || minutos < 0) return 'agora';
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.floor(horas / 24)} dia(s)`;
}
