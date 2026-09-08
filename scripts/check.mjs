import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

async function findScripts(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(entries.map(async entry => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return findScripts(path);
    return entry.name.endsWith('.js') ? [path] : [];
  }));
  return children.flat();
}

const files = [...await findScripts(resolve('src')), ...await findScripts(resolve('scripts'))];
for (const file of files) {
  const child = spawn(process.execPath, ['--check', file], { stdio: 'inherit' });
  const code = await new Promise(resolveExit => child.on('exit', resolveExit));
  if (code !== 0) process.exit(code ?? 1);
}
