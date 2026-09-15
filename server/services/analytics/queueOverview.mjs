/**
 * Agendadas, enviadas e falhas da tela Fila a partir dos disparos salvos.
 * "Pendentes" continua sendo a fila de revisão (PublicationHistory), não entra aqui.
 * Dia e hora no horário de Brasília.
 */

const ACTIVE_STATUSES = new Set(['pending', 'paused', 'waiting_connection', 'running']);
const HOUR = 3_600_000;

function zonedParts(ms, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24, minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute) };
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function productSummary(offer) {
  return {
    name: String(offer?.title || offer?.name || offer?.productName || 'Oferta'),
    image: offer?.imageUrl || null,
    price: toNumber(offer?.currentPrice),
    originalPrice: toNumber(offer?.originalPrice),
    discount: toNumber(offer?.discountPercentage),
    marketplace: offer?.marketplace || 'shopee',
    affiliateUrl: offer?.affiliateUrl || null,
  };
}

function groupList(job) {
  return (Array.isArray(job?.destinations?.groups) ? job.destinations.groups : [])
    .filter((group) => group?.id)
    .map((group) => ({ id: String(group.id), name: String(group.name || group.id) }));
}

export function buildQueueOverview({ jobs = [], now = Date.now(), timeZone = 'America/Sao_Paulo', limit = 50 } = {}) {
  const today = zonedParts(now, timeZone);
  const yesterday = zonedParts(now - 24 * HOUR, timeZone);
  const scheduled = [];
  const sentEvents = new Map();
  const failedEvents = new Map();

  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (!job || !job.id) continue;
    const groups = groupList(job);
    const names = new Map(groups.map((group) => [group.id, group.name]));
    const offers = Array.isArray(job.offers) ? job.offers : [];
    const offerById = new Map(offers.filter((o) => o?.id).map((o) => [String(o.id), o]));

    if (ACTIVE_STATUSES.has(job.status)) {
      scheduled.push({
        jobId: String(job.id),
        status: job.status,
        automatic: job.source === 'queue_automation',
        product: productSummary(offers[0]),
        offersCount: offers.length,
        groups,
        groupsCount: groups.length,
        interval: job.destinations?.interval || null,
        scheduledAt: job.destinations?.scheduledAt || null,
        createdAt: job.createdAt || null,
        sent: Number(job.stats?.sent) || 0,
        total: Math.max(1, offers.length * Math.max(1, groups.length)),
      });
    }

    const attempts = Array.isArray(job.attempts) ? job.attempts : [];
    for (const attempt of attempts) {
      if (!attempt || (attempt.status !== 'sent' && attempt.status !== 'failed')) continue;
      const time = new Date(attempt.sentAt).getTime();
      if (!Number.isFinite(time) || time > now + HOUR) continue;
      const target = attempt.status === 'sent' ? sentEvents : failedEvents;
      const key = `${job.id}:${attempt.offerId}`;
      const event = target.get(key) || {
        jobId: String(job.id),
        automatic: job.source === 'queue_automation',
        product: productSummary(offerById.get(String(attempt.offerId)) || offers[0]),
        groupIds: new Set(),
        at: time,
        error: null,
      };
      event.at = Math.max(event.at, time);
      if (attempt.groupId) event.groupIds.add(String(attempt.groupId));
      if (attempt.error) event.error = String(attempt.error);
      event.names = names;
      target.set(key, event);
    }

    if (job.status === 'failed' && !attempts.some((a) => a?.status === 'failed')) {
      const time = new Date(job.completedAt || job.updatedAt || job.createdAt).getTime();
      if (Number.isFinite(time)) {
        failedEvents.set(`${job.id}:job`, { jobId: String(job.id), automatic: job.source === 'queue_automation', product: productSummary(offers[0]), groupIds: new Set(groups.map((g) => g.id)), at: time, error: job.error ? String(job.error) : 'Disparo falhou.', names });
      }
    }
  }

  const finalize = (event) => {
    const groupIds = [...event.groupIds];
    return {
      jobId: event.jobId,
      automatic: event.automatic,
      product: event.product,
      groupsCount: groupIds.length,
      groupNames: groupIds.map((id) => event.names?.get(id) || id).sort((a, b) => a.localeCompare(b)),
      at: new Date(event.at).toISOString(),
      error: event.error,
    };
  };

  const dayStats = (events) => {
    let todayCount = 0;
    let yesterdayCount = 0;
    const series = Array.from({ length: 24 }, () => 0);
    for (const event of events) {
      const parts = zonedParts(event.at, timeZone);
      if (parts.day === today.day) {
        todayCount += 1;
        series[parts.hour] += 1;
      } else if (parts.day === yesterday.day && parts.minutes <= today.minutes) {
        yesterdayCount += 1;
      }
    }
    return { todayCount, yesterdayCount, series };
  };

  const sentList = [...sentEvents.values()];
  const failedList = [...failedEvents.values()];
  const sentStats = dayStats(sentList);
  const failedStats = dayStats(failedList);
  const newestFirst = (a, b) => b.at - a.at;
  const scheduleTime = (item) => new Date(item.scheduledAt || item.createdAt || 0).getTime() || 0;

  return {
    counts: {
      scheduled: scheduled.length,
      sentToday: sentStats.todayCount,
      sentYesterday: sentStats.yesterdayCount,
      failedToday: failedStats.todayCount,
      failedYesterday: failedStats.yesterdayCount,
    },
    series: { sent: sentStats.series, failed: failedStats.series },
    scheduled: scheduled.sort((a, b) => (b.scheduledAt ? 1 : 0) - (a.scheduledAt ? 1 : 0) || scheduleTime(a) - scheduleTime(b)).slice(0, limit),
    sent: sentList.sort(newestFirst).slice(0, limit).map(finalize),
    failed: failedList.sort(newestFirst).slice(0, limit).map(finalize),
  };
}
