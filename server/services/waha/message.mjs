export const ROTATING_CTAS = [
  'Confira a oferta antes que o preço mude',
  'Garanta o seu enquanto ainda está disponível',
  'Toque no link e aproveite essa oportunidade',
  'Clique aqui agora antes que acabe',
  'Aproveite agora: pode acabar a qualquer momento',
  'Não deixe para depois: confira enquanto está disponível',
  'Veja agora todos os detalhes da promoção',
];

const FALLBACK_TEMPLATE = `OLHA ESSE ACHADINHO!\n\n{TITULO}\n\n{PRECO_ANTIGO}\nPor apenas {PRECO}\n{DESCONTO}\n\n{BENEFICIOS}\n{VENDAS}\n{AVALIACAO}\n\n⚠️ Aproveite enquanto ainda está disponível.\n\n👉 *{CTA}:*\n{LINK}`;

const hasPrice = (offer) => Number.isFinite(Number(offer?.currentPrice)) && Number(offer.currentPrice) > 0;

export function validateOfferMessage(message, offer = {}) {
  const text = String(message || '').trim();
  const link = String(offer.affiliateUrl || offer.productUrl || '').trim();
  const name = String(offer.name || offer.title || offer.productName || '').trim();
  const checks = {
    hook: /(?:olha|oferta|achadinho|preço|preco|promoção|promocao)/i.test(text.split('\n').slice(0, 3).join(' ')),
    name: Boolean(name) && text.toLowerCase().includes(name.toLowerCase().slice(0, 24)),
    price: !hasPrice(offer) || /R\$\s*[\d.]+,\d{2}/.test(text),
    urgency: /(?:pode acabar|tempo limitado|enquanto ainda|antes que|não deixe|nao deixe|aproveite enquanto)/i.test(text),
    cta: /(?:aproveite|clique|confira|pegue|veja|garanta|toque)[^\n]{0,100}/i.test(text),
    link: /^https?:\/\/\S+$/i.test(link) && text.includes(link),
    placeholders: !/(?:\{(?:[A-Z_]+)\}|undefined|null|NaN)/i.test(text),
    brokenEncoding: !/[ÃÂ][\x80-\xBF]|ðŸ|â[œ™šž]/.test(text),
    notTooShort: text.length >= 45,
  };
  return { valid: Object.values(checks).every(Boolean), checks };
}

export function sanitizeOfferCopy(copy, offer = {}) {
  const currentPrice = Number(offer?.currentPrice);
  const originalPrice = Number(offer?.originalPrice);
  const explicitDiscount = Number(offer?.discountPercentage);
  const discount = Number.isFinite(explicitDiscount) && explicitDiscount > 0
    ? Math.round(explicitDiscount)
    : Number.isFinite(originalPrice) && originalPrice > currentPrice && currentPrice > 0
      ? Math.round((1 - currentPrice / originalPrice) * 100)
      : null;
  const ratingValue = offer?.rating ?? offer?.ratingStar ?? offer?.itemRating ?? offer?.reviewScore;
  const hasRating = Number(ratingValue) > 0;
  let discountApplied = false;
  return String(copy || '').replace(/\r/g, '').split('\n')
    .map((line) => line.trimEnd())
    .map((line) => {
      if (/\{[^}]+\}|undefined|null|NaN/i.test(line)) return false;
      if (!hasRating && /avalia|avaliac/i.test(line)) return false;
      if (/Oferta encontrada agora/i.test(line)) return false;
      if (!/^\s*\d{1,3}(?:[.,]\d{1,2})?\s*$/.test(line)) return line;
      if (discount && !discountApplied) { discountApplied = true; return `${discount}% OFF`; }
      return false;
    })
    .filter(Boolean)
    .join('\n')
    .replace(/(De:\s*)R\$\s*([\d.]+,\d{2})/gi, '$1~R$ $2~')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    ;
}

function renderValues(source, offer, options) {
  const brl = (value) => Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const currentPrice = Number(offer.currentPrice);
  const originalPrice = Number(offer.originalPrice);
  const hasCurrentPrice = hasPrice(offer);
  const hasOriginalPrice = Number.isFinite(originalPrice) && originalPrice > currentPrice;
  const discount = Number.isFinite(Number(offer.discountPercentage)) && Number(offer.discountPercentage) > 0
    ? Math.round(Number(offer.discountPercentage))
    : hasOriginalPrice ? Math.round((1 - currentPrice / originalPrice) * 100) : null;
  const cta = ROTATING_CTAS[Math.abs(Number(options.rotationIndex) || 0) % ROTATING_CTAS.length];
  const points = Array.isArray(offer.highlightPoints) ? offer.highlightPoints.filter(Boolean).slice(0, 4) : [];
  const context = `${offer.name || offer.title || offer.productName || ''} ${offer.shortDescription || offer.description || ''} ${offer.category || ''}`.toLowerCase();
  const derived = [];
  if (/(organiza|caixa|pote|prateleira|arm[aá]rio|gaveta)/.test(context)) derived.push('✅ Ajuda a manter tudo organizado');
  if (/(cozinha|casa|banho|utilidade|rotina)/.test(context)) derived.push('✅ Prático para o dia a dia');
  if (/(beleza|cabelo|skincare|maquiagem|unha)/.test(context)) derived.push('✅ Fácil de usar na rotina');
  const benefits = (points.length ? points.map((item) => `✅ ${String(item).trim()}`) : derived.length ? derived : ['✅ Oferta encontrada agora']).slice(0, 4).join('\n');
  const salesValue = offer.salesCount ?? offer.soldCount ?? offer.sales;
  const sales = offer.salesCountText || (Number(salesValue) > 0 ? `+${Number(salesValue).toLocaleString('pt-BR')} vendidos` : '');
  const ratingValue = offer.rating ?? offer.ratingStar ?? offer.itemRating ?? offer.reviewScore;
  const rating = Number(ratingValue) > 0 ? `⭐ ${Number(ratingValue).toFixed(1)} de avaliação` : '⭐ Confira as avaliações no anúncio';
  return source
    .replace(/{TITULO}/g, offer.name || offer.title || offer.productName || 'Oferta especial')
    .replace(/{PRECO}/g, hasCurrentPrice ? `R$ ${brl(currentPrice)}` : 'Preço indisponível')
    .replace(/{PRECO_ANTIGO}/g, hasOriginalPrice ? `❌ De: R$ ${brl(originalPrice)}` : '')
    .replace(/{DESCONTO}/g, discount ? `${discount}% OFF` : '')
    .replace(/{BENEFICIOS}/g, benefits)
    .replace(/{VENDAS}|{SALES}/g, sales)
    .replace(/{AVALIACAO}|{RATING}/g, rating)
    .replace(/{CUPOM}/g, offer.couponCode || '')
    .replace(/{CTA}/g, options.rotatingCTAs === false ? 'Confira a oferta' : cta)
    .replace(/{LINK}/g, offer.affiliateUrl || offer.productUrl || '')
    .replace(/\{(?:BENEFICIOS|VENDAS|SALES|AVALIACAO|RATING)\}/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderFallback(offer, options) {
  return renderValues(FALLBACK_TEMPLATE, offer, options);
}

export function renderWhatsAppMessage(template, offer, options = {}) {
  const currentPrice = Number(offer?.currentPrice);
  const originalPrice = Number(offer?.originalPrice);
  const hasCurrentPrice = hasPrice(offer);
  const hasOriginalPrice = Number.isFinite(originalPrice) && originalPrice > currentPrice;
  const discount = Number.isFinite(Number(offer?.discountPercentage)) && Number(offer.discountPercentage) > 0
    ? Math.round(Number(offer.discountPercentage))
    : hasOriginalPrice ? Math.round((1 - currentPrice / originalPrice) * 100) : null;
  let source = String(template || '').trim();
  if (!source.includes('{PRECO}')) {
    const priceBlock = `${hasOriginalPrice ? '❌ De: {PRECO_ANTIGO}\n' : ''}✅ Por apenas {PRECO}${discount ? `\n${discount}% OFF` : ''}`;
    source = source.includes('{LINK}') ? source.replace('{LINK}', `${priceBlock}\n\n{LINK}`) : `${source}\n\n${priceBlock}`;
  }
  if (!hasOriginalPrice) source = source.split('\n').filter(line => !line.includes('{PRECO_ANTIGO}')).join('\n');
  if (!discount) source = source.split('\n').filter(line => !line.includes('{DESCONTO}')).join('\n');
  const rendered = sanitizeOfferCopy(renderValues(source, offer, options), offer);
  const fallback = sanitizeOfferCopy(renderFallback(offer, options), offer);
  return validateOfferMessage(rendered, offer).valid ? rendered : fallback;
}

export { FALLBACK_TEMPLATE };
