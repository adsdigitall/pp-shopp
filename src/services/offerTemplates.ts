import type { Template } from '../types/product';

const template = (id: string, name: string, message: string): Template => ({
  id,
  name,
  message,
  isCustom: false,
  createdAt: new Date().toISOString(),
});

export const DEFAULT_OFFER_TEMPLATES: Template[] = [
  template('achado-vale-pena', 'Achado que vale a pena', `💛 OLHA ESSE ACHADINHO!\n\n📦 *{TITULO}*\n\n{PRECO_ANTIGO}\n✅ *Por apenas {PRECO}*\n{DESCONTO}\n\n{BENEFICIOS}\n{VENDAS}\n{AVALIACAO}\n\n⚠️ Pode sair desse preço a qualquer momento.\n\n👉 *APROVEITE A OFERTA:*\n{LINK}`),
  template('clique-agora', 'Clique agora e garanta', `🔥 PREÇO MUITO BOM NESSE PRODUTO!\n\n*{TITULO}*\n\n{PRECO_ANTIGO}\n✅ *Por apenas {PRECO}*\n{DESCONTO}\n\n{BENEFICIOS}\n{VENDAS}\n{AVALIACAO}\n\n⚠️ Aproveite enquanto ainda está disponível.\n\n👉 *CLIQUE AQUI PARA VER:*\n{LINK}`),
  template('achado-barato', 'Achado barato', `👀 ACHADO BARATO DO MOMENTO!\n\n📦 *{TITULO}*\n\n{PRECO_ANTIGO}\n✅ *Por apenas {PRECO}*\n{DESCONTO}\n\n{BENEFICIOS}\n{VENDAS}\n{AVALIACAO}\n\n⚠️ Oferta por tempo limitado.\n\n🛒 *PEGUE A OFERTA AQUI:*\n{LINK}`),
  template('humanizado', 'Humanizado', `✨ ESSA OFERTA TÁ VALENDO MUITO!\n\n📦 *{TITULO}*\n\n{PRECO_ANTIGO}\n✅ *Por apenas {PRECO}*\n{DESCONTO}\n\n{BENEFICIOS}\n{VENDAS}\n{AVALIACAO}\n\n⚠️ Por esse preço, pode acabar rápido.\n\n👉 *CONFIRA A OFERTA:*\n{LINK}`),
  template('direto', 'Oferta rápida', `🚨 OFERTA ENCONTRADA!\n\n🔥 *{TITULO}*\n\n{PRECO_ANTIGO}\n✅ *Por apenas {PRECO}*\n{DESCONTO}\n\n{BENEFICIOS}\n{VENDAS}\n{AVALIACAO}\n\n⚠️ Se gostou, aproveita antes que vire o preço.\n\n👉 *CLIQUE AQUI AGORA:*\n{LINK}`),
  template('urgencia', 'Urgência e escassez', `⚠️ OLHA O PREÇO DESSE ACHADO!\n\n📦 *{TITULO}*\n\n{PRECO_ANTIGO}\n✅ *Por apenas {PRECO}*\n{DESCONTO}\n\n{BENEFICIOS}\n{VENDAS}\n{AVALIACAO}\n\n⚠️ Não deixe para depois: confira enquanto está disponível.\n\n👉 *APROVEITE AGORA:*\n{LINK}`),
];

export const OFFER_TEMPLATE_FALLBACK = DEFAULT_OFFER_TEMPLATES[0].message;
