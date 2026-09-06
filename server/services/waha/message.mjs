export const ROTATING_CTAS = [
  'Confira a oferta antes que o preço mude',
  'Garanta o seu enquanto ainda está disponível',
  'Toque no link e aproveite essa oportunidade',
  'Veja agora todos os detalhes da promoção',
];

export function renderWhatsAppMessage(template, offer, options = {}) {
  const cta = ROTATING_CTAS[Math.abs(Number(options.rotationIndex) || 0) % ROTATING_CTAS.length];
  const currentPrice = Number(offer.currentPrice);
  const originalPrice = Number(offer.originalPrice);
  const hasCurrentPrice = Number.isFinite(currentPrice) && currentPrice > 0;
  const hasOriginalPrice = Number.isFinite(originalPrice) && originalPrice > currentPrice;
  const discount = Number.isFinite(Number(offer.discountPercentage)) && Number(offer.discountPercentage) > 0
    ? Math.round(Number(offer.discountPercentage))
    : hasOriginalPrice ? Math.round((1 - currentPrice / originalPrice) * 100) : null;
  let source = String(template || '');
  if (!source.includes('{PRECO}')) {
    const priceBlock = `${hasOriginalPrice ? '~De: {PRECO_ANTIGO}~\n' : ''}✅ *Agora por: {PRECO}*${discount ? `\n_${discount}% OFF_` : ''}`;
    source = source.includes('{LINK}') ? source.replace('{LINK}', `${priceBlock}\n\n{LINK}`) : `${source.trim()}\n\n${priceBlock}`;
  }
  if (!hasOriginalPrice) source = source.split('\n').filter(line => !line.includes('{PRECO_ANTIGO}')).join('\n');
  if (!discount) source = source.split('\n').filter(line => !line.includes('{DESCONTO}')).join('\n');
  let rendered = source
    .replace(/{TITULO}/g, offer.name || '')
    .replace(/{PRECO}/g, hasCurrentPrice ? `R$ ${currentPrice.toFixed(2).replace('.', ',')}` : 'Preço indisponível')
    .replace(/{PRECO_ANTIGO}/g, hasOriginalPrice ? `R$ ${originalPrice.toFixed(2).replace('.', ',')}` : '')
    .replace(/{DESCONTO}/g, discount ? String(discount) : '')
    .replace(/{CUPOM}/g, 'CUPOM10');
  if (rendered.includes('{CTA}')) rendered = rendered.replace(/{CTA}/g, options.rotatingCTAs ? cta : 'Confira a oferta');
  return rendered.replace(/{LINK}/g, offer.affiliateUrl || offer.productUrl || '').replace(/\n{3,}/g, '\n\n').trim();
}
