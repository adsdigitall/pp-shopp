/**
 * Ordem de tentativa de categorias em um ciclo de garimpo.
 *
 * Problema real (23/09/2026): a faixa das 08:00–12:00 buscava "essenciais do
 * dia a dia" (café, creme dental, shampoo). Esses produtos quase nunca pagam
 * 10% de comissão — de 450 produtos vistos, 215 foram barrados só por
 * comissão e nenhum passou. Resultado: grupo mudo das 8h ao meio-dia.
 *
 * O ciclo agora não desiste na primeira categoria: tenta a faixa, depois as
 * categorias gerais marcadas pelo usuário e, por último, as de resgate, que
 * são as que sempre têm oferta forte. O grupo não pode ficar sem receber.
 */

/** Sempre têm desconto alto e comissão boa: usadas quando nada mais passou. */
export const CATEGORIAS_DE_RESGATE = ['ofertas-fortes', 'melhores-ofertas', 'compra-por-impulso'];

/** Quantas categorias no máximo por ciclo (cada uma custa chamadas de API). */
export const MAX_CATEGORIAS_POR_CICLO = 4;

function rotacionar(lista, inicio) {
  if (!lista.length) return [];
  const passo = ((Math.trunc(inicio) % lista.length) + lista.length) % lista.length;
  return [...lista.slice(passo), ...lista.slice(0, passo)];
}

/**
 * @param {object} entrada
 * @param {string[]} [entrada.slotCategories] categorias da faixa de horário
 * @param {string[]} [entrada.userCategories] categorias gerais marcadas na tela
 * @param {number} [entrada.cursor] contador que roda entre os ciclos
 * @param {number} [entrada.max]
 * @returns {string[]} categorias a tentar, na ordem, sem repetir
 */
export function categoryFallbackChain({ slotCategories = [], userCategories = [], cursor = 0, max = MAX_CATEGORIAS_POR_CICLO } = {}) {
  const limpar = (lista) => (Array.isArray(lista) ? lista : [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  const daFaixa = rotacionar(limpar(slotCategories), cursor);
  const gerais = rotacionar(limpar(userCategories), cursor);
  const ordem = [...daFaixa, ...gerais, ...CATEGORIAS_DE_RESGATE];

  const vistas = new Set();
  const cadeia = [];
  for (const categoria of ordem) {
    if (vistas.has(categoria)) continue;
    vistas.add(categoria);
    cadeia.push(categoria);
    if (cadeia.length >= max) break;
  }
  return cadeia;
}
