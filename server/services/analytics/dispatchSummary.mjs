/**
 * Versão leve do job para polling da UI. O job completo (ofertas, tentativas e
 * mensagem) passa de 1 MB no histórico; aqui fica só o que as telas exibem,
 * incluindo um resumo da primeira oferta e o último erro de envio.
 */
export function summarizeDispatchJob(job) {
  if (!job || typeof job !== 'object') return job;
  const { offers, attempts, message, ...rest } = job;
  const first = Array.isArray(offers) ? offers[0] : null;
  const lastFailure = Array.isArray(attempts)
    ? [...attempts].reverse().find((attempt) => attempt?.status === 'failed' && attempt.error)
    : null;
  return {
    ...rest,
    offersCount: Array.isArray(offers) ? offers.length : 0,
    firstOffer: first ? {
      name: String(first.title || first.name || first.productName || 'Oferta'),
      image: first.imageUrl || null,
      price: Number.isFinite(Number(first.currentPrice)) ? Number(first.currentPrice) : null,
      originalPrice: Number.isFinite(Number(first.originalPrice)) ? Number(first.originalPrice) : null,
      marketplace: first.marketplace || null,
      category: first.category || null,
      affiliateUrl: first.affiliateUrl || null,
    } : null,
    lastError: lastFailure ? String(lastFailure.error) : (job.error ? String(job.error) : null),
  };
}
