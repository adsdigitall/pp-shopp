// Função Vercel única para todo o backend (server/index.mjs).
// O roteamento para caminhos aninhados (ex: /api/analytics/mercadolivre) é
// garantido pelos rewrites em vercel.json, não pela convenção de arquivo
// [...path], que não casava paths com mais de um segmento nesta plataforma.
import { createApp } from '../server/index.mjs';

const app = createApp();

export default function handler(req, res) {
  app.emit('request', req, res);
}
