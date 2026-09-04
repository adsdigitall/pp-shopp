// Adaptador para rotas aninhadas do Mercado Livre na Vercel.
import { createApp } from '../../server/index.mjs';

const app = createApp();

export default function handler(req, res) {
  app.emit('request', req, res);
}
