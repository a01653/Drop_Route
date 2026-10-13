import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../scripts/lib/music-validation.mjs';
import { candidates, findPython, isSupported, missingMessage, parseVersion } from '../scripts/lib/python.mjs';

// Se normaliza el final de línea: un checkout de Windows con core.autocrlf escribe CRLF.
const read = path => readFileSync(resolve(ROOT, path), 'utf8').replaceAll('\r\n', '\n');

// Lanzador de Python: se simula el sistema con un ejecutor inyectado.
const runner = table => (command, args) => {
  const entry = table[[command, ...args.slice(0, args.length - 2)].join(' ')];
  return entry ?? { status: 1, stdout: '', error: new Error('ENOENT') };
};

test('lee versiones de Python y rechaza texto ajeno', () => {
  assert.deepEqual(parseVersion('3.13.7\n'), [3, 13, 7]);
  assert.equal(parseVersion('Python was not found'), null);
  assert.equal(parseVersion(''), null);
});

test('exige Python 3.10 o superior', () => {
  assert.equal(isSupported([3, 9, 18]), false);
  assert.equal(isSupported([3, 10, 0]), true);
  assert.equal(isSupported([3, 13, 7]), true);
  assert.equal(isSupported([2, 7, 18]), false);
  assert.equal(isSupported(null), false);
});

test('en Windows prueba primero py -3 y deja PYTHON por delante de todos', () => {
  assert.deepEqual(candidates('win32', {}).map(c => c.label), ['py -3', 'python', 'python3']);
  assert.deepEqual(candidates('linux', {}).map(c => c.label), ['python3', 'python']);
  assert.equal(candidates('win32', { PYTHON: 'C:/py/python.exe' })[0].command, 'C:/py/python.exe');
});

test('usa el primer intérprete válido y salta los ausentes y los antiguos', () => {
  const run = runner({ 'py -3': { status: 1, stdout: '' }, python: { status: 0, stdout: '3.9.18\n' }, python3: { status: 0, stdout: '3.12.4\n' } });
  const { python } = findPython({ platform: 'win32', env: {}, run });
  assert.equal(python.label, 'python3');
  assert.deepEqual(python.version, [3, 12, 4]);
});

test('el atajo de la Microsoft Store que no imprime una versión no se acepta', () => {
  const run = runner({ python: { status: 0, stdout: 'Python was not found; run without arguments to install\n' } });
  const { python, tried } = findPython({ platform: 'win32', env: {}, run });
  assert.equal(python, null);
  assert.ok(tried.some(line => line.startsWith('python: versión')));
});

test('sin Python válido el mensaje es claro y lista lo probado', () => {
  const run = runner({ python3: { status: 0, stdout: '3.8.10\n' } });
  const { python, tried } = findPython({ platform: 'linux', env: {}, run });
  assert.equal(python, null);
  const message = missingMessage(tried);
  assert.match(message, /No se encontró Python 3\.10 o superior/);
  assert.match(message, /python3: versión 3\.8\.10, se requiere 3\.10 o superior/);
  assert.match(message, /python: no disponible/);
  assert.match(message, /variable de entorno PYTHON/);
});

test('sin argumentos el lanzador explica el uso y falla', () => {
  const result = spawnSync(process.execPath, [resolve(ROOT, 'scripts/run-python.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Uso: node scripts\/run-python\.mjs/);
});

test('los scripts de npm no llaman directamente a python3', () => {
  const scripts = JSON.parse(read('package.json')).scripts;
  for (const name of ['data:check', 'docs:build']) {
    assert.match(scripts[name], /^node scripts\/run-python\.mjs scripts\/\w+\.py/, name);
  }
  assert.ok(!Object.values(scripts).some(command => /\bpython3?\b/.test(command.replace('run-python', ''))));
});

// Workflow de GitHub: se comprueba por trabajos que no falta ninguna comprobación.
const workflow = read('.github/workflows/validate-foundation.yml');
const jobBody = name => {
  const match = new RegExp('\\n  ' + name + ':\\n([\\s\\S]*?)(?=\\n  \\w[\\w-]*:\\n|$)').exec(workflow);
  assert.ok(match, 'falta el trabajo ' + name);
  return match[1];
};

test('el trabajo de la base prepara Python 3.10 y ejecuta datos, auditoría, tests y documentación', () => {
  const job = jobBody('foundation');
  assert.match(job, /actions\/setup-python@v\d+\s+with:\s+python-version: '3\.10'/);
  for (const step of ['npm ci --ignore-scripts', 'npm run data:check', 'npm run audit:music', 'npm run test:base', 'npm run docs:check']) {
    assert.ok(job.includes('- run: ' + step), step);
  }
});

test('el trabajo de la aplicación ejecuta tipos, lint, Vitest, build y E2E con Chromium', () => {
  const job = jobBody('app');
  const steps = ['npm ci --ignore-scripts', 'npm run typecheck', 'npm run lint', 'npm run test:unit', 'npm run build', 'npx playwright install --with-deps chromium', 'npm run test:e2e'];
  const positions = steps.map(step => {
    const index = job.indexOf('- run: ' + step);
    assert.ok(index >= 0, step);
    return index;
  });
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), 'orden de los pasos');
});

test('Playwright genera el build y no reutiliza servidores existentes', () => {
  const config = read('playwright.config.ts');
  assert.match(config, /command: `npm run build && npm run preview/);
  assert.match(config, /reuseExistingServer: false/);
  assert.match(config, /--strictPort/);
});
