import assert from 'node:assert/strict';
import test from 'node:test';
import { access, readdir, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

test('build emits the physical Balancete page at the public dashboard path', async () => {
  await exec(process.platform === 'win32' ? 'cmd.exe' : 'npm', process.platform === 'win32' ? ['/c', 'npm', 'run', 'build'] : ['run', 'build']);
  await assert.doesNotReject(access('dist/dashboards/balancete-receita/index.html'));
  await assert.doesNotReject(access('dist/index.html'));
  const assets = await readdir('dist/assets');
  const styles = await Promise.all(assets.filter(name => name.endsWith('.css')).map(name => readFile(`dist/assets/${name}`, 'utf8')));
  assert.ok(styles.some(content => content.includes('.balancete')), 'dashboard styles must be bundled for the root shell');
});
