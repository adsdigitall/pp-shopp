/**
 * Calendário comercial recorrente, sempre avaliado no horário de São Paulo.
 * Datas duplas da Shopee acontecem todo ano; não devem depender de edição
 * manual da automação nem de uma campanha criada apenas uma vez.
 */
function dateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type)?.value || '';
  return { month: value('month'), day: value('day') };
}

const DOUBLE_DATE_CAMPAIGNS = new Map([
  ['09-09', { id: '09-09', label: '9.9' }],
  ['10-10', { id: '10-10', label: '10.10' }],
  ['11-11', { id: '11-11', label: '11.11' }],
  ['12-12', { id: '12-12', label: '12.12' }],
]);

export function activeDoubleDateCampaign(now = new Date()) {
  const { month, day } = dateParts(now);
  return DOUBLE_DATE_CAMPAIGNS.get(`${month}-${day}`) || null;
}

/** Texto de urgência verdadeiro: preço/cupom podem acabar, mas nunca afirma
 * estoque escasso porque a API de afiliados não entrega estoque confiável. */
export function doubleDateUrgencyPrefix(now = new Date()) {
  const campaign = activeDoubleDateCampaign(now);
  if (!campaign) return '';
  return `🚨 *BORA, MENINAS! HOJE É ${campaign.label} NA SHOPEE!*\n\nBora aproveitar: promoções e cupons podem acabar a qualquer momento.`;
}
