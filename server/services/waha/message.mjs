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

function parseSalesCount(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : null;
  const text = String(raw).trim().toLowerCase();
  const match = text.match(/([\d.,]+)\s*(k|mil|m|mi)?/i);
  if (!match) return null;
  let valueText = match[1];
  if (match[2]) valueText = valueText.replace(',', '.');
  else if (/^\d{1,3}([.,]\d{3})+$/.test(valueText)) valueText = valueText.replace(/[.,]/g, '');
  else valueText = valueText.replace(',', '.');
  const value = Number.parseFloat(valueText);
  if (!Number.isFinite(value)) return null;
  const suffix = match[2]?.toLowerCase();
  const multiplier = suffix === 'k' || suffix === 'mil' ? 1_000 : suffix === 'm' || suffix === 'mi' ? 1_000_000 : 1;
  return Math.round(value * multiplier);
}

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
    // WAHA/WhatsApp pode colapsar linhas totalmente vazias em captions.
    // Um separador invisível preserva o espaçamento visual entre blocos.
    .map((line) => line.trimEnd() || '\u2063')
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
  const salesCandidates = [offer.salesCount, offer.soldCount, offer.sales, offer.sold, offer.sold_quantity]
    .map(parseSalesCount).filter((value) => value !== null && value > 0);
  const textSalesValue = parseSalesCount(offer.salesCountText);
  if (textSalesValue !== null && textSalesValue > 0) salesCandidates.push(textSalesValue);
  const salesValue = salesCandidates.length ? Math.max(...salesCandidates) : null;
  const sales = salesValue !== null ? `+${salesValue.toLocaleString('pt-BR')} vendidos` : '';
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

/**
 * Tom humano feminino (sem nome, sem assinatura): uma mulher falando com
 * outras mulheres, como num grupo de achadinhos de verdade. Não é persona
 * de ninguém — só tira o cheiro de robô/IA da mensagem.
 *
 * Segurança: só adiciona abertura (sempre com palavra-gancho válida) e,
 * às vezes, um fecho genérico. Nunca remove nome, preço, urgência, CTA
 * nem link — a validação continua passando.
 */
const HUMAN_OPENERS = [
  (g) => `${g}, meninas! Olha esse achadinho 👀`,
  () => 'Amei esse achadinho, precisei trazer pra vocês 💛',
  () => 'Olha o preço disso aqui, gente ✨',
  () => 'Essa promoção tá maravilhosa 💕',
  () => 'Achadinho novo no grupo, meninas ✨',
  () => 'Olha antes que acabe, meninas 👀',
  (g) => `${g}! Começando com oferta boa de verdade ☀️`,
  () => 'Apaixonada nesse preço 😍',
  () => 'Essa oferta tá perfeita pra gente 💛',
  (g) => `${g}! Dá uma olhada nessa oferta 👇`,
];

const HUMAN_CLOSERS = [
  '\n\nQuem aproveitar me conta depois 💛',
  '\n\nTô sempre de olho por aqui 👀',
  '\n\nFiquem ligadas que já já tem mais ✨',
];

/** Abertura combinando com o produto (categoria, desconto, preço). */
function normText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');
}

const CATEGORY_OPENERS = [
  {
    id: 'cozinha',
    words: ['cozinha', 'panela', 'pote', 'utensilio', 'talher', 'copo', 'prato', 'air fryer', 'cafeteira', 'liquidificador', 'fogao', 'forno', 'geladeira', 'louca', 'frigideira', 'churrasco'],
    openers: [
      () => 'Olha esse achadinho pra sua cozinha 👀',
      () => 'Amei isso aqui pra cozinha, meninas 💛',
      () => 'Sua cozinha vai amar essa oferta ✨',
    ],
  },
  {
    id: 'beleza',
    words: ['beleza', 'maquiagem', 'skincare', 'perfume', 'cabelo', 'secador', 'chapinha', 'escova', 'batom', 'hidratante', 'unha', 'esmalte', 'cosmetico', 'creme', 'shampoo'],
    openers: [
      () => 'Olha esse achadinho de beleza 💄',
      () => 'Pra ficar ainda mais linda, meninas ✨',
      () => 'Achei essa belezura em oferta 💕',
    ],
  },
  {
    id: 'moda',
    words: ['moda', 'vestido', 'blusa', 'bolsa', 'sapato', 'tenis', 'sandalia', 'biquini', 'lingerie', 'calca', 'short', 'saia', 'oculos', 'relogio', 'acessorio', 'bijuteria', 'roupa', 'look'],
    openers: [
      () => 'Look novo sem gastar muito, olha 👀',
      () => 'Achei essa peça perfeita pra gente 💛',
      () => 'Uma oferta de moda que vale cada centavo ✨',
    ],
  },
  {
    id: 'casa',
    words: ['casa', 'organizador', 'organizacao', 'caixa', 'prateleira', 'decoracao', 'almofada', 'cortina', 'tapete', 'luminaria', 'limpeza', 'banheiro', 'quarto', 'sala', 'lar'],
    openers: [
      () => 'Olha esse achadinho pra organizar a casa 🏠',
      () => 'Sua casa merece essa oferta ✨',
      () => 'Achei isso aqui pra deixar tudo no lugar, meninas 💛',
    ],
  },
  {
    id: 'eletro',
    words: ['fone', 'celular', 'smartphone', 'caixa de som', 'smart tv', 'notebook', 'tablet', 'carregador', 'ventilador', 'eletro', 'tech', 'bluetooth'],
    openers: [
      () => 'Olha essa oferta tech que eu achei 🔌',
      () => 'Preço bom em eletrônico é aqui, meninas 👀',
    ],
  },
  {
    id: 'infantil',
    words: ['infantil', 'crianca', 'bebe', 'maternidade', 'brinquedo', 'escolar', 'fralda', 'mamadeira', 'enxoval'],
    openers: [
      () => 'Mamães, olha esse achadinho 👶',
      () => 'Pro cantinho das crianças, em oferta ✨',
    ],
  },
];

const HUMAN_OPENERS_DESCONTAO = [
  () => 'O desconto disso aqui tá surreal, olha 👀',
  () => 'Derreteu o preço nessa oferta, meninas ✨',
];

const HUMAN_OPENERS_PRECINHO = [
  () => 'Precinhos que a gente ama, olha 💛',
  () => 'Olha esse precinho de achadinho ✨',
];

function detectCategoryOpeners(offer) {
  const hay = normText(
    [offer?.category, offer?.name, offer?.title, offer?.productName].filter(Boolean).join(' '),
  );
  if (!hay.trim()) return null;
  for (const entry of CATEGORY_OPENERS) {
    if (entry.words.some((w) => hay.includes(w))) return entry.openers;
  }
  return null;
}

export const HUMAN_INTERSTITIALS = [
  'Vou continuar garimpando por aqui, meninas 💛',
  'Já já volto com mais achadinhos ✨',
  'Tô de olho nos preços, já volto 👀',
  'Amei garimpar isso hoje, já trago mais 💕',
  'Segura aí que ainda tem coisa linda chegando ✨',
  'Fiquem ligadas que os preços mudam rápido ⏰',
  'Daqui a pouco passo aqui com mais novidades ☕',
  'Continuo separando só o que vale a pena, meninas 💛',
];

export function humanGreeting(hour) {
  const h = Number(hour);
  if (Number.isFinite(h)) {
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }
  return 'Oi';
}

/**
 * @param {string} message mensagem já renderizada e válida
 * @param {object} [offer] oferta (categoria/desconto/preço guiam a abertura)
 * @param {{ rotationIndex?: number, hour?: number }} [options]
 * @returns {string} mensagem com abertura/fecho humanos
 */
export function humanizeMessage(message, offer = {}, options = {}) {
  const text = String(message || '');
  if (!text.trim()) return text;
  const rotationIndex = Math.max(0, Number(options.rotationIndex) || 0);
  const greeting = humanGreeting(options.hour);
  const discount = Number(offer?.discountPercentage);
  const price = Number(offer?.currentPrice);
  const pool = detectCategoryOpeners(offer)
    || (Number.isFinite(discount) && discount >= 50 ? HUMAN_OPENERS_DESCONTAO : null)
    || (Number.isFinite(price) && price > 0 && price < 20 ? HUMAN_OPENERS_PRECINHO : null)
    || HUMAN_OPENERS;
  const opener = pool[rotationIndex % pool.length](greeting);
  let out = `${opener}\n\n${text.trim()}`;
  if (rotationIndex % 3 === 0) {
    out += HUMAN_CLOSERS[rotationIndex % HUMAN_CLOSERS.length];
  }
  return out;
}
