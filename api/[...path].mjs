// Adaptador mínimo para executar o servidor Node existente como função Vercel.
// As credenciais continuam exclusivamente nas variáveis de ambiente server-side.
import { createApp } from '../server/index.mjs';

const app = createApp();

export default function handler(req, res) {
  app.emit('request', req, res);
}
