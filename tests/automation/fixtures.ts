import type { CreateShareJobInput } from '../../src/automation/index.ts';

export function validShareJobInput(
  overrides: Partial<CreateShareJobInput> = {},
): CreateShareJobInput {
  return {
    productId: 'prod-001',
    destinationId: 'dest-whatsapp-grupo-ofertas',
    message: [
      '🔥 *PROMOÇÃO RELÂMPAGO NA SHOPEE!* 🔥',
      '📦 Fone TWS com display LED',
      '✅ Por apenas: R$ 39,90 (-60% OFF)',
      '🛒 https://s.shopee.com.br/aff_fone_tws_top',
    ].join('\n'),
    imageUrl: 'https://images.example.com/fone-tws.png',
    affiliateUrl: 'https://s.shopee.com.br/aff_fone_tws_top',
    ...overrides,
  };
}
