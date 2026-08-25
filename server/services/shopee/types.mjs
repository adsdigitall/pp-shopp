/**
 * Tipos da integração Shopee Affiliate Open API (JSDoc, runtime Node).
 *
 * Referência oficial:
 *   https://affiliate.shopee.com.br/open_api  (documentação oficial, requer login)
 *   Endpoint BR: POST https://open-api.affiliate.shopee.com.br/graphql
 *
 * Campos do ProductOfferV2 usados (conforme documentação oficial):
 *   itemId              Int64    - ID do produto
 *   productName         String   - nome
 *   productLink         String   - URL canônica do produto
 *   offerLink           String   - link de afiliado JÁ com tracking
 *   imageUrl            String   - imagem
 *   priceMin/priceMax   String   - faixa de preço atual (BRL decimal em string)
 *   priceDiscountRate   Int      - % de desconto (ex.: 10 = 10%)
 *   sales               Int      - vendas históricas
 *   ratingStar          String   - avaliação média ("4.8")
 *   commissionRate      String!  - taxa total "0.38" = 38%  *** PRIVATE DATA ***
 *   commission          String   - comissão estimada em R$ *** PRIVATE DATA ***
 *   shopId/shopName/shopType     - dados da loja
 *   periodStartTime/periodEndTime - validade da oferta (Unix s)
 */

/**
 * Erros oficiais (extensions.code):
 *   10000 System Error | 10010 Parse Error | 10020 Invalid Signature
 *   10030 Rate Limit   | 11001 Params Error | 10035 No API Access
 * @typedef {'AUTH'|'NO_ACCESS'|'RATE_LIMIT'|'PARAMS'|'TIMEOUT'|'NETWORK'|'UPSTREAM'} ShopeeErrorKind
 */

/**
 * @typedef {Object} NormalizedProduct
 * @property {string} id
 * @property {string} title
 * @property {string} imageUrl
 * @property {number|null} currentPrice
 * @property {number|null} originalPrice
 * @property {number|null} discountPercentage
 * @property {number|null} commissionRate  PRIVATE DATA (%)
 * @property {number|null} commissionAmount PRIVATE DATA (R$)
 * @property {string|null} productUrl
 * @property {string|null} affiliateUrl
 * @property {number|null} rating
 * @property {number|null} soldCount
 */

export {};
