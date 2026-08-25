import type {
  CreateSharePayloadInput,
  SharePayload,
} from '../../src/automation/index.ts';
import { createSharePayload } from '../../src/automation/index.ts';

/** Payload público válido (group_message). Sem comissão, sem secrets. */
export function validSharePayloadInput(
  overrides: Partial<CreateSharePayloadInput> = {},
): CreateSharePayloadInput {
  return {
    productId: 'prod-001',
    title: 'Fone TWS com display LED',
    generatedCopy: [
      '🔥 *PROMOÇÃO RELÂMPAGO NA SHOPEE!* 🔥',
      '📦 Fone TWS com display LED',
      '✅ Por apenas: R$ 39,90 (-60% OFF)',
      '🛒 https://s.shopee.com.br/aff_fone_tws_top',
    ].join('\n'),
    affiliateUrl: 'https://s.shopee.com.br/aff_fone_tws_top',
    generatedImageUrl: 'https://images.example.com/fone-tws.png',
    currentPrice: 39.9,
    originalPrice: 99.9,
    discountPercentage: 60,
    shippingHighlight: 'Frete Grátis',
    targetFormat: 'group_message',
    cta: 'Compre agora',
    ...overrides,
  };
}

export function validSharePayload(
  overrides: Partial<CreateSharePayloadInput> = {},
): SharePayload {
  return createSharePayload(validSharePayloadInput(overrides));
}

/** Payload no formato story. */
export function storySharePayload(
  overrides: Partial<CreateSharePayloadInput> = {},
): SharePayload {
  return createSharePayload(
    validSharePayloadInput({
      targetFormat: 'story',
      generatedCopy: '🚨 ACHADINHO: Fone TWS por R$ 39,90 — arrasta pra cima!',
      cta: 'Arrasta pra cima',
      ...overrides,
    }),
  );
}

/** Input de ShareJob válido. */
export function validShareJobInput(
  overrides: Partial<{ destinationId: string; payload: SharePayload }> = {},
) {
  return {
    destinationId: 'dest-whatsapp-grupo-ofertas',
    payload: validSharePayload(),
    ...overrides,
  };
}
