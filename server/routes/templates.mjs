const userTemplates = new Map();

export function createTemplateHandlers({ sendJson, readJsonBody, getDefaultTemplates }) {
  async function handleGetTemplates(req, res) {
    try {
      const userId = 'default_user';
      let templates = userTemplates.get(userId);
      if (!templates) {
        templates = getDefaultTemplates();
        userTemplates.set(userId, templates);
      }
      sendJson(res, 200, { templates });
    } catch {
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar templates.' } });
    }
  }

  async function handleSaveTemplate(req, res) {
    try {
      const userId = 'default_user';
      const body = await readJsonBody(req);
      const { id, name, message } = body;
      if (!name || !message) {
        sendJson(res, 400, { error: { code: 'MISSING_PARAMS', message: 'Nome e mensagem são obrigatórios.' } });
        return;
      }
      let templates = userTemplates.get(userId) || getDefaultTemplates();
      const template = { id: id || `tpl-${Date.now()}`, name, message, isCustom: true, createdAt: new Date().toISOString() };
      templates = templates.filter((item) => item.id !== template.id);
      templates.push(template);
      userTemplates.set(userId, templates);
      sendJson(res, 200, { template });
    } catch {
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao salvar template.' } });
    }
  }

  async function handleDeleteTemplate(req, res, pathOnly) {
    try {
      const userId = 'default_user';
      const templateId = pathOnly.replace('/api/templates/', '');
      let templates = userTemplates.get(userId) || getDefaultTemplates();
      templates = templates.filter((item) => item.id !== templateId);
      userTemplates.set(userId, templates);
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Erro ao remover template.' } });
    }
  }

  return { handleGetTemplates, handleSaveTemplate, handleDeleteTemplate };
}
