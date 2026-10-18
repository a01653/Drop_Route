import {spawnSync} from 'node:child_process';

for (const script of ['scripts/build_dts.py', 'scripts/build_manuals.py']) {
  const result = spawnSync(process.execPath, ['scripts/run-python.mjs', script], {stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
