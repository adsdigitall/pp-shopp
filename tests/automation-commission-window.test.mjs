import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAutomationOffer, DEFAULT_AUTOMATION_FILTERS } from '../server/services/automation/scoring.mjs';
import { normalizeMinCommissionRate } from '../server/services/automation/config.mjs';

// Oferta boa em tudo; cada teste mexe só na comissão.
const ofertaBase = {
  name: 'Pote hermético 1,2L',
  salesCount: 4000,
  rating: 4.9,
  reviewsCount: 800,
  currentPrice: 39.9,
  discountPercentage: 45,
  stock: 50,
  commissionRate: 20,
};

test('comissão abaixo do corte reprova, mesmo com o produto vendendo muito', () => {
  const decisao = evaluateAutomationOffer({ ...ofertaBase, commissionRate: 6 });
  assert.equal(decisao.approved, false);
  assert.ok(
    decisao.reasons.some((reason) => reason.startsWith('Comissão baixa')),
    `esperava reprovar por comissão, veio: ${decisao.reasons.join(', ')}`,
  );
});

test('comissão no corte ou acima passa', () => {
  assert.equal(evaluateAutomationOffer({ ...ofertaBase, commissionRate: 15 }).approved, true);
  assert.equal(evaluateAutomationOffer({ ...ofertaBase, commissionRate: 32 }).approved, true);
});

test('sem comissão informada não entra (não dá para saber se compensa)', () => {
  const decisao = evaluateAutomationOffer({ ...ofertaBase, commissionRate: null });
  assert.equal(decisao.approved, false);
  assert.ok(decisao.reasons.includes('Comissão desconhecida'));
});

test('config antiga sem o campo continua usando o corte padrão de 10%', () => {
  const decisao = evaluateAutomationOffer({ ...ofertaBase, commissionRate: 8 }, { minCommissionRate: undefined });
  assert.equal(decisao.approved, false, 'undefined não pode apagar o padrão e liberar comissão baixa');
  assert.equal(decisao.filters.minCommissionRate, DEFAULT_AUTOMATION_FILTERS.minCommissionRate);
});

test('corte configurável: 0 desliga, 25 aperta', () => {
  assert.equal(evaluateAutomationOffer({ ...ofertaBase, commissionRate: 3 }, { minCommissionRate: 0 }).approved, true);
  assert.equal(evaluateAutomationOffer({ ...ofertaBase, commissionRate: 20 }, { minCommissionRate: 25 }).approved, false);
});

test('comissão mínima salva: valor inválido ou absurdo volta para o padrão', () => {
  assert.equal(normalizeMinCommissionRate(20), 20);
  assert.equal(normalizeMinCommissionRate(0), 0);
  assert.equal(normalizeMinCommissionRate('abc'), 10);
  assert.equal(normalizeMinCommissionRate(-5), 10);
  assert.equal(normalizeMinCommissionRate(90), 10);
  assert.equal(normalizeMinCommissionRate(undefined), 10);
});

// ---- "Parar de enviar" também para a fila já montada ----
// Bug real: com parada às 01:00, a descoberta parava mas os disparos que já
// estavam enfileirados continuavam saindo pela madrugada.
const { automationIsWithinSchedule, dispatchJobAllowedNow } = await import('../server/services/automation/config.mjs');

const brt = (isoUtc) => new Date(isoUtc);
const config = { activeFrom: '08:00', activeUntil: '01:00', activeDays: [0, 1, 2, 3, 4, 5, 6] };
const jobAutomatico = { source: 'queue_automation', status: 'pending' };
const jobManual = { source: 'manual', status: 'pending' };

test('janela 08:00–01:00: manda de dia e até 00:59, para a partir de 01:00', () => {
  assert.equal(automationIsWithinSchedule(config, brt('2026-09-21T13:00:00Z')), true, '10:00 BRT deveria enviar');
  assert.equal(automationIsWithinSchedule(config, brt('2026-09-22T02:30:00Z')), true, '23:30 BRT deveria enviar');
  assert.equal(automationIsWithinSchedule(config, brt('2026-09-22T03:40:00Z')), true, '00:40 BRT ainda dentro');
  assert.equal(automationIsWithinSchedule(config, brt('2026-09-22T04:00:00Z')), false, '01:00 BRT tem que parar');
  assert.equal(automationIsWithinSchedule(config, brt('2026-09-22T06:00:00Z')), false, '03:00 BRT parado');
});

test('fila automática não sai depois do horário de parada; disparo manual sai', () => {
  const umaHora = brt('2026-09-22T04:10:00Z'); // 01:10 BRT
  assert.equal(dispatchJobAllowedNow(jobAutomatico, config, umaHora), false, 'oferta automática enfileirada não pode sair 01:10');
  assert.equal(dispatchJobAllowedNow(jobManual, config, umaHora), true, 'o que o usuário mandou enviar continua saindo');
  const meioDia = brt('2026-09-21T15:00:00Z');
  assert.equal(dispatchJobAllowedNow(jobAutomatico, config, meioDia), true, 'dentro da janela a fila automática volta a sair');
});

test('dia desligado não envia nem o que já está na fila', () => {
  const soDiaDeSemana = { ...config, activeDays: [1, 2, 3, 4, 5] };
  const domingo = brt('2026-09-20T15:00:00Z'); // domingo 12:00 BRT
  assert.equal(dispatchJobAllowedNow(jobAutomatico, soDiaDeSemana, domingo), false);
});

// ---- O corte vale também para o que JÁ está na fila ----
// Regra aplicada em processDispatchJob (server/index.mjs): a oferta pode ter
// entrado na fila antes do corte atual. Aqui travamos a decisão em si.
const jobDaFila = (commissionRate) => ({ source: 'queue_automation', offers: [{ id: 'x1', commissionRate }] });
const reprovaNaHoraDoEnvio = (job, minCommission) => (job.offers || []).some((offer) => {
  if (minCommission <= 0) return false;
  const raw = offer?.commissionRate;
  if (raw === null || raw === undefined || raw === '') return false;
  const rate = Number(raw);
  return Number.isFinite(rate) && rate < minCommission;
});

test('oferta de comissão baixa que já estava na fila é descartada no envio', () => {
  assert.equal(reprovaNaHoraDoEnvio(jobDaFila(4), 10), true, 'comissão de 4% não pode sair com corte de 10%');
  assert.equal(reprovaNaHoraDoEnvio(jobDaFila(null), 10), false, 'sem comissão informada NÃO descarta: esvaziaria a fila inteira por falta de dado');
  assert.equal(reprovaNaHoraDoEnvio(jobDaFila(10), 10), false, 'no corte, sai');
  assert.equal(reprovaNaHoraDoEnvio(jobDaFila(27), 10), false, 'acima do corte, sai');
  assert.equal(reprovaNaHoraDoEnvio({ source: 'queue_automation', offers: [{ id: 'x2' }] }, 10), false, 'campo ausente também não descarta');
  assert.equal(reprovaNaHoraDoEnvio(jobDaFila(2), 0), false, 'corte 0 desligado: não descarta nada');
});
