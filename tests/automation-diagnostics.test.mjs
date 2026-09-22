import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseAutomation, AUTOMATION_STATUS } from '../server/services/automation/diagnostics.mjs';

// 10:00 de Brasília numa terça — dentro da janela padrão 08:00–23:00.
const DENTRO_DO_HORARIO = new Date('2026-09-22T13:00:00Z');
const MADRUGADA = new Date('2026-09-22T06:00:00Z'); // 03:00 BRT

const configBase = {
  enabled: true,
  groups: [{ id: '120363001@g.us' }],
  activeFrom: '08:00',
  activeUntil: '23:00',
  activeDays: [0, 1, 2, 3, 4, 5, 6],
  offerInterval: { value: 5, unit: 'minutes' },
  minCommissionRate: 10,
};

const jobEnviadoAs = (iso) => ({
  source: 'queue_automation',
  status: 'completed',
  attempts: [{ status: 'sent', sentAt: iso }],
});

const diagnostico = (extra = {}) => diagnoseAutomation({
  config: { ...configBase, ...(extra.config || {}) },
  jobs: extra.jobs || [],
  whatsappConectado: extra.whatsappConectado !== false,
  agora: extra.agora || DENTRO_DO_HORARIO,
});

test('automação desligada é o primeiro motivo', () => {
  const resultado = diagnostico({ config: { enabled: false } });
  assert.equal(resultado.status, AUTOMATION_STATUS.DESLIGADA);
  assert.match(resultado.mensagem, /desligada/i);
});

test('sem grupo selecionado avisa antes de qualquer outra coisa', () => {
  assert.equal(diagnostico({ config: { groups: [] } }).status, AUTOMATION_STATUS.SEM_GRUPO);
});

test('fora do horário explica que volta no próximo horário', () => {
  const resultado = diagnostico({ agora: MADRUGADA });
  assert.equal(resultado.status, AUTOMATION_STATUS.FORA_DO_HORARIO);
  assert.equal(resultado.dentroDoHorario, false);
  assert.deepEqual(resultado.janela, { de: '08:00', ate: '23:00' });
});

test('WhatsApp desconectado aparece mesmo dentro do horário', () => {
  const resultado = diagnostico({ whatsappConectado: false });
  assert.equal(resultado.status, AUTOMATION_STATUS.WHATSAPP_FORA);
});

test('fila vazia com garimpo sem aprovadas aponta o filtro, com os motivos', () => {
  const resultado = diagnostico({
    config: {
      lastDiscovery: {
        at: '2026-09-22T12:58:00Z',
        category: 'casa-cozinha',
        scanned: 150,
        kept: 0,
        blocked: { repeats: 12, gate: { 'Comissão baixa (abaixo de 10%)': 88, 'Poucas vendas': 30, 'Score abaixo do mínimo': 8 } },
      },
    },
  });
  assert.equal(resultado.status, AUTOMATION_STATUS.SEM_OFERTA_APROVADA);
  assert.equal(resultado.ultimoGarimpo.vistas, 150);
  assert.equal(resultado.ultimoGarimpo.motivos[0].motivo, 'Comissão baixa (abaixo de 10%)');
  assert.equal(resultado.ultimoGarimpo.motivos[0].quantas, 88);
  assert.equal(resultado.ultimoGarimpo.motivos.length, 3, 'mostra os três maiores motivos');
});

test('envio recente = aguardando o intervalo, com os minutos que faltam', () => {
  const agora = DENTRO_DO_HORARIO;
  const enviadoHaUmMinuto = new Date(agora.getTime() - 60_000).toISOString();
  const resultado = diagnostico({ jobs: [jobEnviadoAs(enviadoHaUmMinuto)], agora });
  assert.equal(resultado.status, AUTOMATION_STATUS.AGUARDANDO_INTERVALO);
  assert.ok(resultado.proximaEmMinutos >= 1 && resultado.proximaEmMinutos <= 6, `minutos estranhos: ${resultado.proximaEmMinutos}`);
  assert.equal(resultado.ultimoEnvio, enviadoHaUmMinuto);
});

test('tudo certo e intervalo vencido = enviando', () => {
  const agora = DENTRO_DO_HORARIO;
  const enviadoHaMuito = new Date(agora.getTime() - 60 * 60_000).toISOString();
  const resultado = diagnostico({ jobs: [jobEnviadoAs(enviadoHaMuito)], agora });
  assert.equal(resultado.status, AUTOMATION_STATUS.ENVIANDO);
});

test('garimpo com ofertas aprovadas não culpa o filtro', () => {
  const resultado = diagnostico({
    config: { lastDiscovery: { at: '2026-09-22T12:58:00Z', category: 'beleza-autocuidado', scanned: 90, kept: 4, blocked: { repeats: 3, gate: {} } } },
  });
  assert.notEqual(resultado.status, AUTOMATION_STATUS.SEM_OFERTA_APROVADA);
});

test('sem configuração nenhuma não quebra e diz que está desligada', () => {
  const resultado = diagnoseAutomation({ config: null, jobs: [], whatsappConectado: false, agora: DENTRO_DO_HORARIO });
  assert.equal(resultado.status, AUTOMATION_STATUS.DESLIGADA);
  assert.equal(resultado.ofertasNaFila, 0);
  assert.equal(resultado.ultimoGarimpo, null);
});
