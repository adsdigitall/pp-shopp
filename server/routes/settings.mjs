import { redactSensitive } from '../lib/redactSensitive.mjs';

export function createSettingsReadHandler({ sendJson, getSettings, setSettings, getDefaultSettings }) {
  return async function handleGetSettings(req, res) {
    try {
      const userId = 'default_user';
      let settings = getSettings(userId);
      if (!settings) {
        settings = getDefaultSettings();
        setSettings(userId, settings);
      }
      sendJson(res, 200, redactSensitive(settings));
    } catch {
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar configurações.' } });
    }
  };
}

export function createSettingsChannelsHandler({ sendJson, readJsonBody, getSettings, setSettings, getDefaultSettings }) {
  return async function handleUpdateChannels(req, res) {
    try {
      const userId = 'default_user';
      const body = await readJsonBody(req);
      const settings = getSettings(userId) || getDefaultSettings();
      settings.channels = { ...settings.channels, ...body };
      setSettings(userId, settings);
      sendJson(res, 200, { ok: true, settings: redactSensitive(settings) });
    } catch (err) {
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar canais.' } });
    }
  };
}

export function createSettingsTemplatesHandler({ sendJson, readJsonBody, getSettings, setSettings, getDefaultSettings }) {
  return async function handleUpdateTemplates(req, res) {
    try {
      const userId = 'default_user';
      const body = await readJsonBody(req);
      const settings = getSettings(userId) || getDefaultSettings();
      settings.templates = body;
      setSettings(userId, settings);
      sendJson(res, 200, { ok: true, settings: redactSensitive(settings) });
    } catch (err) {
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar templates.' } });
    }
  };
}

export function createSettingsAccountHandler({ sendJson, readJsonBody, getSettings, setSettings, getDefaultSettings }) {
  return async function handleUpdateAccount(req, res) {
    try {
      const userId = 'default_user';
      const body = await readJsonBody(req);
      const settings = getSettings(userId) || getDefaultSettings();
      settings.account = { ...settings.account, ...body };
      setSettings(userId, settings);
      sendJson(res, 200, { ok: true, settings: redactSensitive(settings) });
    } catch (err) {
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar conta.' } });
    }
  };
}
