import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DAILY_RHYTHM,
  normalizeDailyRhythm,
  rhythmDayKey,
  slotsDueToday,
  pickRhythmMessage,
} from '../server/services/automation/rhythm.mjs';

// 2026-09-11 07:45 BRT = 10:45 UTC (sem horário de verão no Brasil).
const atBrt = (h, m = 0) => new Date(Date.UTC(2026, 8, 11, h + 3, m, 0));

test('ritmo padrão tem os 6 momentos do dia', () => {
  assert.deepEqual(
    DEFAULT_DAILY_RHYTHM.map((s) => [s.id, s.time]),
    [
      ['bom-dia', '07:30'],
      ['aquecimento', '07:50'],
      ['almoco', '12:00'],
      ['voltei', '13:00'],
      ['tarde', '18:00'],
      ['boa-noite', '22:50'],
    ],
  );
  assert.ok(DEFAULT_DAILY_RHYTHM.every((s) => s.messages.length >= 2));
  assert.ok(
    DEFAULT_DAILY_RHYTHM.flatMap((s) => s.messages).every((line) => !/Carol/i.test(line)),
  );
});

test('slotsDueToday dispara vencidos, uma vez por dia, com tolerância de 20 min', () => {
  const slots = normalizeDailyRhythm(undefined);
  // 07:45 BRT: bom-dia (07:30) vencido; aquecimento (07:50) ainda não.
  assert.deepEqual(
    slotsDueToday({ slots, nowMinutes: 7 * 60 + 45, sentToday: [] }).map((s) => s.id),
    ['bom-dia'],
  );
  // Já enviado não repete.
  assert.deepEqual(
    slotsDueToday({ slots, nowMinutes: 7 * 60 + 45, sentToday: ['bom-dia'] }),
    [],
  );
  // Atraso acima de 20 min pula (bom dia às 15h seria mais robô que humano).
  assert.deepEqual(
    slotsDueToday({ slots, nowMinutes: 15 * 60, sentToday: [] }).map((s) => s.id),
    [],
  );
  // Slot desligado não dispara.
  const off = normalizeDailyRhythm([{ id: 'bom-dia', enabled: false }]);
  assert.deepEqual(
    slotsDueToday({ slots: off, nowMinutes: 7 * 60 + 45, sentToday: [] }).map((s) => s.id),
    [],
  );
});

test('normalizeDailyRhythm preserva horários válidos e completa o resto', () => {
  const slots = normalizeDailyRhythm([{ id: 'almoco', time: '12:30', enabled: false }]);
  assert.equal(slots.find((s) => s.id === 'almoco')?.time, '12:30');
  assert.equal(slots.find((s) => s.id === 'almoco')?.enabled, false);
  assert.equal(slots.find((s) => s.id === 'bom-dia')?.time, '07:30');
  const weird = normalizeDailyRhythm([{ id: 'tarde', time: '25:99' }]);
  assert.equal(weird.find((s) => s.id === 'tarde')?.time, '18:00');
});

test('pickRhythmMessage é estável no dia e varia entre dias', () => {
  const slot = DEFAULT_DAILY_RHYTHM[0];
  assert.equal(pickRhythmMessage(slot, '2026-09-11'), pickRhythmMessage(slot, '2026-09-11'));
});

test('rhythmDayKey ancora em Brasília em qualquer TZ da máquina', () => {
  assert.equal(rhythmDayKey(atBrt(7, 45)), '2026-09-11');
  assert.equal(rhythmDayKey(new Date(Date.UTC(2026, 8, 11, 2, 0))), '2026-09-10');
});
