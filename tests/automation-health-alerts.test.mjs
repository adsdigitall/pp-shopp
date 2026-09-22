import test from 'node:test';
import assert from 'node:assert/strict';
import { planHealthAlerts, PERSISTENCIA_MS, REPETE_ALERTA_MS, SILENCIO_MAXIMO_MS } from '../server/services/notifications/healthAlerts.mjs';

const T0 = new Date('2026-09-22T13:00:00Z');
const maisTarde = (ms) => new Date(T0.getTime() + ms);

const saudavel = {
  ligada: true, dentroDoHorario: true, whatsappConectado: true, status: 'aguardando-intervalo',
  ultimoEnvio: new Date(T0.getTime() - 60_000).toISOString(),
};
const whatsappFora = { ...saudavel, whatsappConectado: false, status: 'whatsapp-fora' };

test('queda rápida do WhatsApp não vira aviso (evita alarme a cada oscilação)', () => {
  const primeira = planHealthAlerts({ diagnostico: whatsappFora, previous: null, agora: T0 });
  assert.equal(primeira.alerts.length, 0, 'primeiro instante do problema ainda não avisa');
  assert.equal(primeira.state.problema, 'whatsapp-fora');

  const voltou = planHealthAlerts({ diagnostico: saudavel, previous: primeira.state, agora: maisTarde(30_000) });
  assert.equal(voltou.alerts.length, 0, 'voltou antes de avisar: ninguém precisa saber');
  assert.equal(voltou.state.problema, null);
});

test('problema que persiste avisa uma vez, e não repete a cada ciclo', () => {
  let estado = planHealthAlerts({ diagnostico: whatsappFora, previous: null, agora: T0 }).state;
  const avisou = planHealthAlerts({ diagnostico: whatsappFora, previous: estado, agora: maisTarde(PERSISTENCIA_MS) });
  assert.equal(avisou.alerts.length, 1);
  assert.match(avisou.alerts[0].title, /WhatsApp desconectado/);
  assert.match(avisou.alerts[0].body, /reconecte/i);
  estado = avisou.state;

  const logoDepois = planHealthAlerts({ diagnostico: whatsappFora, previous: estado, agora: maisTarde(PERSISTENCIA_MS + 60_000) });
  assert.equal(logoDepois.alerts.length, 0, 'não pode avisar de novo a cada 15 segundos');
});

test('problema longo é lembrado de 6 em 6 horas', () => {
  const estado = { problema: 'whatsapp-fora', desde: T0.toISOString(), avisadoEm: T0.toISOString() };
  const antes = planHealthAlerts({ diagnostico: whatsappFora, previous: estado, agora: maisTarde(REPETE_ALERTA_MS - 60_000) });
  assert.equal(antes.alerts.length, 0);
  const depois = planHealthAlerts({ diagnostico: whatsappFora, previous: estado, agora: maisTarde(REPETE_ALERTA_MS) });
  assert.equal(depois.alerts.length, 1, 'passadas 6h, lembra que continua caído');
});

test('quando resolve, avisa que voltou — mas só se tinha avisado do problema', () => {
  const comAviso = { problema: 'whatsapp-fora', desde: T0.toISOString(), avisadoEm: T0.toISOString() };
  const voltou = planHealthAlerts({ diagnostico: saudavel, previous: comAviso, agora: maisTarde(10 * 60_000) });
  assert.equal(voltou.alerts.length, 1);
  assert.match(voltou.alerts[0].title, /voltou a enviar/i);

  const semAviso = { problema: 'whatsapp-fora', desde: T0.toISOString(), avisadoEm: null };
  assert.equal(planHealthAlerts({ diagnostico: saudavel, previous: semAviso, agora: maisTarde(60_000) }).alerts.length, 0);
});

test('automação desligada nunca vira aviso', () => {
  const desligada = { ...whatsappFora, ligada: false, status: 'desligada' };
  const estado = { problema: 'whatsapp-fora', desde: T0.toISOString(), avisadoEm: T0.toISOString() };
  const resultado = planHealthAlerts({ diagnostico: desligada, previous: estado, agora: maisTarde(60 * 60_000) });
  assert.equal(resultado.alerts.length, 0);
  assert.equal(resultado.state.problema, null);
});

test('sem grupo selecionado também avisa', () => {
  const semGrupo = { ...saudavel, status: 'sem-grupo' };
  const estado = planHealthAlerts({ diagnostico: semGrupo, previous: null, agora: T0 }).state;
  const avisou = planHealthAlerts({ diagnostico: semGrupo, previous: estado, agora: maisTarde(PERSISTENCIA_MS) });
  assert.equal(avisou.alerts.length, 1);
  assert.match(avisou.alerts[0].title, /Nenhum grupo/i);
});

test('dentro do horário e sem enviar há mais de 2h vira aviso', () => {
  const parado = { ...saudavel, status: 'sem-oferta-aprovada', ultimoEnvio: new Date(T0.getTime() - SILENCIO_MAXIMO_MS).toISOString() };
  const estado = planHealthAlerts({ diagnostico: parado, previous: null, agora: T0 }).state;
  assert.equal(estado.problema, 'parado');
  const avisou = planHealthAlerts({ diagnostico: parado, previous: estado, agora: maisTarde(PERSISTENCIA_MS) });
  assert.equal(avisou.alerts.length, 1);
  assert.match(avisou.alerts[0].title, /2 horas/);
});

test('silêncio curto dentro do horário não avisa (filtro sem oferta num ciclo é normal)', () => {
  const recente = { ...saudavel, status: 'sem-oferta-aprovada', ultimoEnvio: new Date(T0.getTime() - 20 * 60_000).toISOString() };
  const resultado = planHealthAlerts({ diagnostico: recente, previous: null, agora: T0 });
  assert.equal(resultado.state.problema, null);
  assert.equal(resultado.alerts.length, 0);
});

test('fora do horário é silêncio esperado: não avisa', () => {
  const noturno = { ...saudavel, dentroDoHorario: false, status: 'fora-do-horario', ultimoEnvio: new Date(T0.getTime() - 5 * 60 * 60_000).toISOString() };
  const estado = planHealthAlerts({ diagnostico: noturno, previous: null, agora: T0 }).state;
  assert.equal(estado.problema, null);
  assert.equal(planHealthAlerts({ diagnostico: noturno, previous: estado, agora: maisTarde(60 * 60_000) }).alerts.length, 0);
});
