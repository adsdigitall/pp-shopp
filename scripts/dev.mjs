/**
 * Orquestrador de desenvolvimento (zero dependências):
 * sobe o backend interno (/api) e o Vite (frontend) no mesmo terminal,
 * encaminhando os logs de ambos e encerrando os dois processos juntos.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill();
    } catch {
      /* processo já morreu */
    }
  }
  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', () => shutdown(0));

function run(label, command, args, color) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: process.env,
    shell: false,
  });

  const write = (stream, chunk) => {
    const text = String(chunk);
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      stream.write(`\x1b[${color}m[${label}]\x1b[0m ${line}\n`);
    }
  };

  child.stdout.on('data', (chunk) => write(process.stdout, chunk));
  child.stderr.on('data', (chunk) => write(process.stderr, chunk));
  child.on('exit', (code) => {
    if (!shuttingDown) {
      process.stderr.write(
        `\x1b[${color}m[${label}]\x1b[0m finalizou com código ${code}. Encerrando todos...\n`
      );
      shutdown(code ?? 1);
    }
  });

  children.push(child);
  return child;
}

// Backend interno primeiro (o proxy do Vite aponta para ele)
run('api', process.execPath, ['server/index.mjs'], '36'); // cyan
// Frontend Vite
run('web', process.execPath, ['node_modules/vite/bin/vite.js'], '35'); // magenta
