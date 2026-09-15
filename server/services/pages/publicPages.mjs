/**
 * Páginas públicas (vitrine, convite para grupos e link na bio): validação do que
 * o painel manda, slug e o HTML da rota /p/:slug.
 *
 * O HTML nunca expõe o link de destino: cada item aponta para /p/:slug/ir/:indice,
 * que conta o clique e redireciona para o link SALVO na página (sem open redirect).
 */

export const PAGE_TYPES = ['vitrine', 'convite', 'linktree'];
const LIMITS = { name: 80, description: 200, products: 60, groups: 20, links: 30, title: 200 };

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function uniqueSlug(base, taken = []) {
  const used = new Set(taken);
  const root = slugify(base) || 'pagina';
  if (!used.has(root)) return root;
  let n = 2;
  while (used.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

const cleanText = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function httpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function inviteUrl(value) {
  const url = httpUrl(value);
  if (!url) return null;
  const host = new URL(url).hostname.toLowerCase();
  return host === 'chat.whatsapp.com' || host === 'wa.me' || host === 't.me' || host === 'telegram.me' ? url : null;
}

const toPrice = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

function sanitizeProducts(list) {
  return (Array.isArray(list) ? list : [])
    .map((p) => ({
      id: cleanText(p?.id, 120) || null,
      name: cleanText(p?.name || p?.title, LIMITS.title),
      imageUrl: httpUrl(p?.imageUrl),
      currentPrice: toPrice(p?.currentPrice),
      originalPrice: toPrice(p?.originalPrice),
      affiliateUrl: httpUrl(p?.affiliateUrl),
      marketplace: cleanText(p?.marketplace, 30) || null,
    }))
    .filter((p) => p.name && p.affiliateUrl)
    .slice(0, LIMITS.products);
}

function sanitizeGroups(list) {
  return (Array.isArray(list) ? list : [])
    .map((g) => ({ name: cleanText(g?.name, LIMITS.name), description: cleanText(g?.description, LIMITS.description), inviteUrl: inviteUrl(g?.inviteUrl) }))
    .filter((g) => g.name && g.inviteUrl)
    .slice(0, LIMITS.groups);
}

function sanitizeLinks(list) {
  return (Array.isArray(list) ? list : [])
    .map((l) => ({ title: cleanText(l?.title, LIMITS.name), url: httpUrl(l?.url) }))
    .filter((l) => l.title && l.url)
    .slice(0, LIMITS.links);
}

/**
 * Campos editáveis de uma página. Stats, id, userId e datas nunca vêm do cliente.
 * Em atualização, o que não veio continua como estava.
 */
export function sanitizePageInput(body = {}, existing = null) {
  const type = existing?.type || body.type;
  if (!PAGE_TYPES.includes(type)) return { error: 'Tipo de página inválido.' };
  const pick = (key) => (Object.prototype.hasOwnProperty.call(body, key) ? body[key] : existing?.[key]);
  const name = cleanText(pick('name'), LIMITS.name);
  if (!name) return { error: 'Dê um nome para a página.' };
  const value = {
    type,
    name,
    description: cleanText(pick('description'), LIMITS.description),
    status: pick('status') === 'published' ? 'published' : 'draft',
    coverImage: httpUrl(pick('coverImage')),
    products: type === 'vitrine' ? sanitizeProducts(pick('products')) : [],
    groups: type === 'convite' ? sanitizeGroups(pick('groups')) : [],
    links: type === 'linktree' ? sanitizeLinks(pick('links')) : [],
  };
  if (Object.prototype.hasOwnProperty.call(body, 'slug') && body.slug) value.slug = slugify(body.slug);
  return { value };
}

/** Robôs de prévia de link (WhatsApp, Telegram, Facebook...) não contam como visita. */
export function isPreviewBot(userAgent) {
  return /whatsapp|telegrambot|facebookexternalhit|facebot|twitterbot|slackbot|discordbot|linkedinbot|skypeuripreview|googlebot|bingbot|bot\b|crawler|spider|preview/i.test(String(userAgent || ''));
}

export function pageCoverImage(page) {
  if (page?.coverImage) return page.coverImage;
  if (page?.type === 'vitrine') return (page.products || []).find((p) => p.imageUrl)?.imageUrl || null;
  return null;
}

export function pageItems(page) {
  if (page?.type === 'vitrine') return Array.isArray(page.products) ? page.products : [];
  if (page?.type === 'convite') return Array.isArray(page.groups) ? page.groups : [];
  if (page?.type === 'linktree') return Array.isArray(page.links) ? page.links : [];
  return [];
}

export function pageItemTarget(page, index) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0) return null;
  const item = pageItems(page)[i];
  if (!item) return null;
  return httpUrl(item.affiliateUrl || item.inviteUrl || item.url);
}

const brl = (value) => (value == null ? '' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export function renderPublicPage(page) {
  const slug = escapeHtml(page.slug);
  const items = pageItems(page);
  const go = (i) => `/p/${slug}/ir/${i}`;
  let body = '';
  if (page.type === 'vitrine') {
    body = `<div class="grid">${items.map((p, i) => {
      const off = p.originalPrice && p.currentPrice && p.originalPrice > p.currentPrice ? Math.round((1 - p.currentPrice / p.originalPrice) * 100) : null;
      return `<a class="card" href="${go(i)}" rel="nofollow noopener">
        <div class="thumb">${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy">` : ''}${off ? `<span class="off">-${off}%</span>` : ''}</div>
        <div class="info"><h2>${escapeHtml(p.name)}</h2>
        <p class="price">${escapeHtml(brl(p.currentPrice))}${p.originalPrice && off ? ` <s>${escapeHtml(brl(p.originalPrice))}</s>` : ''}</p>
        <span class="btn">Ver oferta</span></div></a>`;
    }).join('')}</div>`;
  } else if (page.type === 'convite') {
    body = `<div class="list">${items.map((g, i) => `<a class="row" href="${go(i)}" rel="nofollow noopener">
      <span class="icon">👥</span><span class="grow"><strong>${escapeHtml(g.name)}</strong>${g.description ? `<small>${escapeHtml(g.description)}</small>` : ''}</span>
      <span class="btn">Entrar no grupo</span></a>`).join('')}</div>`;
  } else {
    body = `<div class="list">${items.map((l, i) => `<a class="link" href="${go(i)}" rel="nofollow noopener">${escapeHtml(l.title)}</a>`).join('')}</div>`;
  }
  const empty = items.length ? '' : '<p class="empty">Em breve novidades por aqui.</p>';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(page.name)}</title>
<meta name="description" content="${escapeHtml(page.description || page.name)}">
<meta property="og:title" content="${escapeHtml(page.name)}">
<meta property="og:description" content="${escapeHtml(page.description || '')}">
${page.type === 'vitrine' && items[0]?.imageUrl ? `<meta property="og:image" content="${escapeHtml(items[0].imageUrl)}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap">
<style>
*{box-sizing:border-box}body{margin:0;font-family:"Plus Jakarta Sans",system-ui,sans-serif;background:#0c1418;color:#d9dee1}
.wrap{max-width:960px;margin:0 auto;padding:28px 12px 40px}@media(max-width:420px){.info h2{font-size:13px}.price{font-size:16px}.btn{padding:9px 6px;font-size:13px}}
header{text-align:center;margin-bottom:22px}header h1{margin:0;color:#f2f5f6;font-size:28px;font-weight:800}
header p{margin:8px 0 0;color:#8b959c}.share{margin-top:14px;display:inline-flex;gap:8px;align-items:center;border:1px solid rgba(255,255,255,.14);background:transparent;color:#f2f5f6;border-radius:12px;padding:10px 16px;font:600 14px inherit;cursor:pointer}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px}
.card{display:flex;flex-direction:column;background:#0e1519;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;text-decoration:none;color:inherit}
.thumb{position:relative;aspect-ratio:4/3;background:#fff}.thumb img{width:100%;height:100%;object-fit:cover}
.off{position:absolute;left:10px;bottom:10px;background:#fd5723;color:#fff;font-weight:800;font-size:12px;border-radius:8px;padding:2px 8px}
.info{padding:12px;display:flex;flex-direction:column;gap:6px;flex:1}.info h2{margin:0;font-size:14px;font-weight:600;color:#f2f5f6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.price{margin:0;color:#fd5723;font-weight:800;font-size:18px}.price s{color:#5b666e;font-size:12px;font-weight:400}
.btn{margin-top:auto;display:block;text-align:center;background:linear-gradient(135deg,#fd5723,#ea4a18);color:#fff;border-radius:12px;padding:10px;font-weight:700;font-size:14px}
.list{display:flex;flex-direction:column;gap:12px;max-width:560px;margin:0 auto}
.row{display:flex;align-items:center;gap:12px;background:#0e1519;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px;text-decoration:none;color:inherit}
.row .btn{margin:0;padding:10px 14px;white-space:nowrap}.icon{font-size:22px}.grow{flex:1;min-width:0}.grow strong{display:block;color:#f2f5f6}.grow small{color:#8b959c}
.link{display:block;text-align:center;background:#0e1519;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px;color:#f2f5f6;text-decoration:none;font-weight:600}
.link:hover,.row:hover,.card:hover{border-color:rgba(253,87,35,.45)}.empty{text-align:center;color:#8b959c}
footer{text-align:center;margin-top:28px;color:#5b666e;font-size:12px}
</style>
</head>
<body><main class="wrap">
<header><h1>${escapeHtml(page.name)}</h1>${page.description ? `<p>${escapeHtml(page.description)}</p>` : ''}
<button class="share" type="button" id="share">Compartilhar</button></header>
${body}${empty}
<footer>Feito com Radar de Oferta</footer>
</main>
<script>
document.getElementById('share').addEventListener('click', async function () {
  var url = location.href.split('#')[0];
  try { fetch('/p/${slug}/compartilhar', { method: 'POST', keepalive: true }); } catch (e) {}
  if (navigator.share) { try { await navigator.share({ title: document.title, url: url }); return; } catch (e) { return; } }
  try { await navigator.clipboard.writeText(url); this.textContent = 'Link copiado!'; } catch (e) {}
});
</script>
</body></html>`;
}
