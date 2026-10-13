import { spawnSync } from 'node:child_process';

export const MIN_PYTHON = [3, 10];

const probeCode = "import sys; print('.'.join(map(str, sys.version_info[:3])))";

export function parseVersion(text) {
  const match = /^\s*(\d+)\.(\d+)\.(\d+)/.exec(String(text));
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function isSupported(version, min = MIN_PYTHON) {
  if (!version) return false;
  return version[0] > min[0] || (version[0] === min[0] && version[1] >= min[1]);
}

// En Windows el lanzador py es lo más fiable; python3 puede ser el atajo de la
// Microsoft Store, que no ejecuta nada. PYTHON, si existe, tiene prioridad.
export function candidates(platform = process.platform, env = process.env) {
  const list = [];
  if (env.PYTHON) list.push({ command: env.PYTHON, args: [], label: 'PYTHON=' + env.PYTHON });
  if (platform === 'win32') {
    list.push({ command: 'py', args: ['-3'], label: 'py -3' });
    list.push({ command: 'python', args: [], label: 'python' });
    list.push({ command: 'python3', args: [], label: 'python3' });
  } else {
    list.push({ command: 'python3', args: [], label: 'python3' });
    list.push({ command: 'python', args: [], label: 'python' });
  }
  return list;
}

function defaultRun(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true });
  return { status: result.status, stdout: result.stdout ?? '', error: result.error };
}

// Devuelve { python, tried }. python es null si ningún candidato sirve.
export function findPython({ platform, env, run = defaultRun } = {}) {
  const tried = [];
  for (const candidate of candidates(platform, env)) {
    const result = run(candidate.command, [...candidate.args, '-c', probeCode]);
    if (result.error || result.status !== 0) {
      tried.push(candidate.label + ': no disponible');
      continue;
    }
    const version = parseVersion(result.stdout);
    if (!isSupported(version)) {
      const found = String(result.stdout).trim() || 'desconocida';
      tried.push(candidate.label + ': versión ' + found + ', se requiere ' + MIN_PYTHON.join('.') + ' o superior');
      continue;
    }
    return { python: { ...candidate, version }, tried };
  }
  return { python: null, tried };
}

export function missingMessage(tried) {
  return [
    'No se encontró Python ' + MIN_PYTHON.join('.') + ' o superior.',
    'Candidatos probados:',
    ...tried.map((line) => '  - ' + line),
    'Instala Python desde https://www.python.org/downloads/ y vuelve a ejecutar el comando.',
    'En Windows el instalador oficial añade el lanzador «py». Si Python está en otra ruta, indícala con la variable de entorno PYTHON.',
  ].join('\n');
}
