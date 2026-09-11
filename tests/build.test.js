import assert from 'node:assert/strict';
import test from 'node:test';
import { access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

test('build emits the physical Balancete page at the public dashboard path', async () => {
  await exec(process.platform === 'win32' ? 'cmd.exe' : 'npm', process.platform === 'win32' ? ['/c', 'npm', 'run', 'build'] : ['run', 'build']);
  await assert.doesNotReject(access('dist/dashboards/balancete-receita/index.html'));
  await assert.doesNotReject(access('dist/index.html'));
});
