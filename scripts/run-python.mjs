// Ejecuta un script de Python con un intérprete 3.10 o superior localizado en
// el sistema. Sustituye a las llamadas directas a python3, que no existe en
// Windows con la instalación habitual. Uso: node scripts/run-python.mjs script.py [argumentos]
import { spawnSync } from 'node:child_process';
import { findPython, missingMessage } from './lib/python.mjs';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Uso: node scripts/run-python.mjs <script.py> [argumentos]');
  process.exit(2);
}

const { python, tried } = findPython();
if (!python) {
  console.error(missingMessage(tried));
  process.exit(1);
}

// PYTHONUTF8 evita acentos rotos en la salida cuando no hay consola, por ejemplo en la CI.
const result = spawnSync(python.command, [...python.args, ...args], {
  stdio: 'inherit',
  env: { ...process.env, PYTHONUTF8: process.env.PYTHONUTF8 ?? '1' },
});
if (result.error) {
  console.error('No se pudo ejecutar ' + python.label + ': ' + result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
