export const ROTATING_CTAS = [
  'Confira a oferta antes que o preço mude',
  'Garanta o seu enquanto ainda está disponível',
  'Toque no link e aproveite essa oportunidade',
  'Veja agora todos os detalhes da promoção',
];

export function renderWhatsAppMessage(template, offer, options = {}) {
  const cta = ROTATING_CTAS[Math.abs(Number(options.rotationIndex) || 0) % ROTATING_CTAS.length];
  let source = String(template || '');
  if (!offer.originalPrice || offer.originalPrice <= offer.currentPrice) source = source.split('\n').filter(line => !line.includes('{PRECO_ANTIGO}')).join('\n');
  let rendered = source
    .replace(/{TITULO}/g, offer.name || '')
    .replace(/{PRECO}/g, offer.currentPrice ? `R$ ${offer.currentPrice.toFixed(2).replace('.', ',')}` : '—')
    .replace(/{PRECO_ANTIGO}/g, offer.originalPrice ? `R$ ${offer.originalPrice.toFixed(2).replace('.', ',')}` : '—')
    .replace(/{CUPOM}/g, 'CUPOM10');
  if (rendered.includes('{CTA}')) rendered = rendered.replace(/{CTA}/g, options.rotatingCTAs ? cta : 'Confira a oferta');
  return rendered.replace(/{LINK}/g, offer.affiliateUrl || offer.productUrl || '').replace(/\n{3,}/g, '\n\n').trim();
}
