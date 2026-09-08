import assert from 'node:assert/strict';
import test from 'node:test';
import { openArchive } from '../../src/core/archive.js';
import { zipOf } from '../helpers/zip.js';

test('finds a case-insensitive basename in a subfolder', () => {
  const archive = openArchive(zipOf({
    'visualizacao.json': '{"schemaVersion":"1.0.0","dashboard":{"id":"balancete-receita","version":"1.0.0"}}',
    'dados/Balancete-Receita.JSON': '{"ok":true}'
  }));
  assert.deepEqual(archive.findByBasename('balancete-receita.json'), ['dados/Balancete-Receita.JSON']);
  assert.deepEqual(archive.readJson('dados/Balancete-Receita.JSON'), { ok: true });
});

test('requires one metadata file at the archive root', () => {
  assert.throws(
    () => openArchive(zipOf({ 'dados/visualizacao.json': '{}' })),
    /visualizacao\.json/i
  );
});
