import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

async function findTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return entry.name.endsWith('.test.js') ? [path] : [];
  }));
  return nested.flat();
}

const tests = await findTests(resolve('tests'));
if (!tests.length) {
  console.error('Nenhum teste foi encontrado.');
  process.exit(1);
}

const child = spawn(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
