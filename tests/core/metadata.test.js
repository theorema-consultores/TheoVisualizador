import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMetadata } from '../../src/core/metadata.js';
import { resolveDashboard } from '../../src/core/dashboard-registry.js';

const validMetadata = {
  schemaVersion: '1.0.0',
  dashboard: { id: 'balancete-receita', version: '1.0.0' }
};

test('parses the exact first metadata schema', () => {
  assert.deepEqual(parseMetadata(JSON.stringify(validMetadata)), validMetadata);
});

test('rejects metadata with a data-file declaration', () => {
  assert.throws(
    () => parseMetadata(JSON.stringify({ ...validMetadata, files: {} })),
    /metadados/i
  );
});

test('maps a registered dashboard version to its physical page', () => {
  assert.deepEqual(resolveDashboard(validMetadata), {
    id: 'balancete-receita',
    version: '1.0.0',
    page: 'dashboards/balancete-receita/'
  });
});

test('rejects an unregistered dashboard version', () => {
  assert.throws(
    () => resolveDashboard({ ...validMetadata, dashboard: { ...validMetadata.dashboard, version: '2.0.0' } }),
    /não suportada/i
  );
});
