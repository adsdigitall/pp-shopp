/**
 * Grupos que realmente receberam oferta na janela: só tentativas com status
 * 'sent' contam (falha, deduplicado e cancelado não). Base do card
 * "Grupos ativos" da Visão Geral, que antes contava a seleção de Meus Grupos.
 */
export function activeDispatchGroups(jobs = [], { hours = 24, now = Date.now() } = {}) {
  const since = now - Math.max(1, Number(hours) || 24) * 3_600_000;
  const byId = new Map();
  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (!job || !Array.isArray(job.attempts)) continue;
    const names = new Map(
      (Array.isArray(job.destinations?.groups) ? job.destinations.groups : [])
        .filter((group) => group?.id)
        .map((group) => [String(group.id), group.name]),
    );
    for (const attempt of job.attempts) {
      if (attempt?.status !== 'sent' || !attempt.groupId) continue;
      const time = new Date(attempt.sentAt).getTime();
      if (!Number.isFinite(time) || time < since || time > now) continue;
      const id = String(attempt.groupId);
      const current = byId.get(id);
      if (!current || time > current.time) {
        byId.set(id, { id, name: names.get(id) || current?.name || id, time });
      }
    }
  }
  return [...byId.values()]
    .sort((a, b) => b.time - a.time || a.name.localeCompare(b.name))
    .map(({ id, name, time }) => ({ id, name, lastSentAt: new Date(time).toISOString() }));
}
