import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePageInput, slugify, uniqueSlug, renderPublicPage, pageItemTarget, escapeHtml, isPreviewBot, pageCoverImage } from '../server/services/pages/publicPages.mjs';

const product = (extra = {}) => ({ id: 'p1', name: 'Fone Bluetooth', imageUrl: 'https://img/1.jpg', currentPrice: 19.9, originalPrice: 50, affiliateUrl: 'https://s.shopee.com.br/abc', marketplace: 'shopee', ...extra });

test('slug: minúsculo, sem acento e só letras, números e hífen', () => {
  assert.equal(slugify('Achadinhos da Carol! 🔥'), 'achadinhos-da-carol');
  assert.equal(slugify('   Ção & Beleza  '), 'cao-beleza');
  assert.equal(uniqueSlug('achados', ['achados', 'achados-2']), 'achados-3');
  assert.equal(uniqueSlug('novo', ['outro']), 'novo');
});

test('vitrine válida guarda só campos permitidos e produtos com link http(s)', () => {
  const { value, error } = sanitizePageInput({
    type: 'vitrine', name: '  Achadinhos da Carol ', description: 'As melhores ofertas', status: 'published',
    products: [product(), product({ id: 'p2', affiliateUrl: 'javascript:alert(1)' }), product({ id: 'p3', imageUrl: 'data:text/html,x' })],
    stats: { visits: 999 }, userId: 'hacker',
  });
  assert.equal(error, undefined);
  assert.equal(value.name, 'Achadinhos da Carol');
  assert.equal(value.status, 'published');
  assert.deepEqual(value.products.map((p) => p.id), ['p1', 'p3']);
  assert.equal(value.products[1].imageUrl, null);
  assert.equal(value.stats, undefined);
  assert.equal(value.userId, undefined);
});

test('convite só aceita links de convite do WhatsApp ou Telegram', () => {
  const { value } = sanitizePageInput({
    type: 'convite', name: 'Grupos VIP',
    groups: [
      { name: 'Achadinhos', inviteUrl: 'https://chat.whatsapp.com/AbCdEf123' },
      { name: 'Telegram', inviteUrl: 'https://t.me/meucanal' },
      { name: 'Falso', inviteUrl: 'https://site-malicioso.com/x' },
    ],
  });
  assert.deepEqual(value.groups.map((g) => g.name), ['Achadinhos', 'Telegram']);
});

test('linktree exige título e url http(s) e limita a quantidade', () => {
  const links = Array.from({ length: 40 }, (_, i) => ({ title: `Link ${i}`, url: `https://exemplo.com/${i}` }));
  const { value } = sanitizePageInput({ type: 'linktree', name: 'Bio', links: [...links, { title: '', url: 'https://x.com' }, { title: 'ftp', url: 'ftp://x' }] });
  assert.equal(value.links.length, 30);
});

test('erros claros para nome vazio e tipo inválido', () => {
  assert.match(sanitizePageInput({ type: 'vitrine', name: '  ' }).error, /nome/i);
  assert.match(sanitizePageInput({ type: 'blog', name: 'x' }).error, /tipo/i);
});

test('atualização parcial mantém o tipo e os campos que não vieram', () => {
  const existing = { type: 'vitrine', name: 'Antiga', description: 'desc', status: 'draft', products: [product()] };
  const { value } = sanitizePageInput({ status: 'published' }, existing);
  assert.equal(value.type, 'vitrine');
  assert.equal(value.name, 'Antiga');
  assert.equal(value.products.length, 1);
  assert.equal(value.status, 'published');
});

test('página pública escapa HTML e aponta cliques para a rota contadora', () => {
  const page = { slug: 'carol', type: 'vitrine', name: '<script>alert(1)</script>', description: 'Oi "você"', products: [product({ name: '<img src=x onerror=alert(1)>' })] };
  const html = renderPublicPage(page);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x onerror'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('href="/p/carol/ir/0"'));
  assert.ok(!html.includes('s.shopee.com.br/abc'), 'link real não aparece no HTML, só via redirecionamento contado');
  assert.equal(escapeHtml(`a&b<"'>`), 'a&amp;b&lt;&quot;&#39;&gt;');
});

test('destino do clique vem só do que está salvo na página', () => {
  const page = { type: 'linktree', links: [{ title: 'Loja', url: 'https://loja.com' }] };
  assert.equal(pageItemTarget(page, 0), 'https://loja.com/');
  assert.equal(pageItemTarget(page, 1), null);
  assert.equal(pageItemTarget(page, -1), null);
  assert.equal(pageItemTarget({ type: 'vitrine', products: [product()] }, '0'), 'https://s.shopee.com.br/abc');
  assert.equal(pageItemTarget({ type: 'convite', groups: [{ name: 'g', inviteUrl: 'https://chat.whatsapp.com/x' }] }, 0), 'https://chat.whatsapp.com/x');
});

test('prévia de link do WhatsApp/Telegram não conta como visita', () => {
  assert.equal(isPreviewBot('WhatsApp/2.23.20.0 A'), true);
  assert.equal(isPreviewBot('TelegramBot (like TwitterBot)'), true);
  assert.equal(isPreviewBot('facebookexternalhit/1.1'), true);
  assert.equal(isPreviewBot('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36'), false);
});

test('capa usa a imagem escolhida ou a do primeiro produto da vitrine', () => {
  assert.equal(pageCoverImage({ type: 'vitrine', coverImage: 'https://c/1.jpg', products: [product()] }), 'https://c/1.jpg');
  assert.equal(pageCoverImage({ type: 'vitrine', products: [product({ imageUrl: null }), product({ imageUrl: 'https://img/2.jpg' })] }), 'https://img/2.jpg');
  assert.equal(pageCoverImage({ type: 'linktree', links: [] }), null);
  assert.equal(sanitizePageInput({ type: 'linktree', name: 'x', coverImage: 'javascript:1' }).value.coverImage, null);
});
