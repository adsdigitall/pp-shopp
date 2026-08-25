/**
 * Carregador de variáveis de ambiente SERVER-SIDE.
 * Lê .env.local da raiz do projeto SEM sobrescrever o que já existe em process.env.
 * Este arquivo roda exclusivamente em Node (nunca entra no bundle do frontend).
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

export function parseEnvFile(content) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

export function loadEnvFile(fileName = '.env.local') {
  // ENV_FILE permite apontar para outro arquivo (usado nos testes)
  const filePath = process.env.ENV_FILE || path.join(PROJECT_ROOT, fileName);
  if (!existsSync(filePath)) return {};
  try {
    return parseEnvFile(readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

export function initEnv() {
  const fileVars = loadEnvFile('.env.local');
  for (const [key, value] of Object.entries(fileVars)) {
    const current = process.env[key];
    if (current === undefined || current === '') process.env[key] = value;
  }
}
