import test from 'node:test';
import assert from 'node:assert/strict';
import { planQueueMaintenance, RUNNING_TRAVADO_MS, OFERTA_VENCE_EM_MS } from '../server/services/automation/queueHealth.mjs';

const AGORA = new Date('2026-09-22T17:30:00Z');
const atras = (ms) => new Date(AGORA.getTime() - ms).toISOString();

const job = (extra) => ({ id: 'j1', source: 'queue_automation', status: 'pending', createdAt: atras(60_000), ...extra });

test('job travado em execução volta para a fila', () => {
  const plano = planQueueMaintenance({
    jobs: [job({ id: 'travado', status: 'running', startedAt: atras(RUNNING_TRAVADO_MS) })],
    agora: AGORA,
  });
  assert.deepEqual(plano.destravar, ['travado']);
});

test('job em execução há pouco tempo não é mexido', () => {
  const plano = planQueueMaintenance({
    jobs: [job({ id: 'recente', status: 'running', startedAt: atras(60_000) })],
    agora: AGORA,
  });
  assert.deepEqual(plano.destravar, []);
});

test('oferta automática parada há mais de 6h é cancelada, não enviada', () => {
  const plano = planQueueMaintenance({
    jobs: [
      job({ id: 'velha', createdAt: atras(OFERTA_VENCE_EM_MS) }),
      job({ id: 'nova', createdAt: atras(30 * 60_000) }),
    ],
    agora: AGORA,
  });
  assert.deepEqual(plano.expirar, ['velha'], 'preço de horas atrás não pode cair no grupo');
});

test('disparo do usuário nunca é cancelado por tempo', () => {
  const plano = planQueueMaintenance({
    jobs: [
      { id: 'manual', source: 'manual', status: 'pending', createdAt: atras(3 * OFERTA_VENCE_EM_MS) },
      { id: 'agendado', source: 'queue_automation', status: 'pending', createdAt: atras(3 * OFERTA_VENCE_EM_MS), destinations: { scheduledAt: '2026-09-30T12:00:00Z' } },
    ],
    agora: AGORA,
  });
  assert.deepEqual(plano.expirar, [], 'o que a pessoa mandou ou agendou é decisão dela');
});

test('fila grande: só o que venceu sai, o resto continua', () => {
  const jobs = [
    ...Array.from({ length: 900 }, (_, i) => job({ id: `antiga-${i}`, createdAt: atras(OFERTA_VENCE_EM_MS + i * 1000) })),
    ...Array.from({ length: 4 }, (_, i) => job({ id: `recente-${i}`, createdAt: atras(i * 60_000) })),
  ];
  const plano = planQueueMaintenance({ jobs, agora: AGORA });
  assert.equal(plano.expirar.length, 900);
  assert.ok(!plano.expirar.some((id) => id.startsWith('recente')), 'oferta fresca continua na fila');
});

test('job sem horário de início não é destravado às cegas', () => {
  const plano = planQueueMaintenance({ jobs: [{ id: 'sem-inicio', source: 'queue_automation', status: 'running' }], agora: AGORA });
  assert.deepEqual(plano.destravar, []);
});
