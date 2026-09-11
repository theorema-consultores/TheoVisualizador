import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMetadata, parseMetadataList } from '../../src/core/metadata.js';
import { resolveDashboard } from '../../src/core/dashboard-registry.js';

const validMetadata = {
  schemaVersion: '1.0.0',
  dashboard: { id: 'balancete-receita', version: '1.0.0' }
};

test('parses the exact first metadata schema', () => {
  assert.deepEqual(parseMetadata(JSON.stringify(validMetadata)), validMetadata);
});

test('parses multiple visualizations from an array manifest', () => {
  assert.deepEqual(parseMetadataList(JSON.stringify([validMetadata, validMetadata])), [validMetadata, validMetadata]);
});

test('normalizes a vision manifest into report tabs with their data files', () => {
  assert.deepEqual(parseMetadataList(JSON.stringify({
    schemaVersion: '1.0.0',
    visao: { id: 'visao-contabil', nome: 'Visão Contábil', relatorios: [
      { id: 'balancete-receita', version: '1.0.0', arquivo: 'dados/balancete.json' }
    ] }
  })), [{ ...validMetadata, arquivo: 'dados/balancete.json' }]);
});

test('accepts the manifest returned by the supplied protocol', () => {
  const manifest = {
    schemaVersion: '1.0.0',
    visao: {
      id: 'visao-contabil',
      nome: 'Visão Contábil',
      relatorios: [{ id: 'balancete-receita', version: '1.0.0', arquivo: 'balancete-receita.json' }]
    }
  };
  assert.deepEqual(parseMetadataList(JSON.stringify(manifest)), [{ ...validMetadata, arquivo: 'balancete-receita.json' }]);
});

test('rejects metadata with a data-file declaration', () => {
  assert.throws(
    () => parseMetadata(JSON.stringify({ ...validMetadata, files: {} })),
    /metadados/i
  );
});

test('maps a registered dashboard version to its physical page and mount contract', () => {
  const dashboard = resolveDashboard(validMetadata);
  assert.deepEqual({ id: dashboard.id, label: dashboard.label, version: dashboard.version, page: dashboard.page }, {
    id: 'balancete-receita', label: 'B. Receita', version: '1.0.0', page: 'dashboards/balancete-receita/'
  });
  assert.equal(typeof dashboard.load, 'function');
  assert.equal(typeof dashboard.mount, 'function');
});

test('rejects an unregistered dashboard version', () => {
  assert.throws(
    () => resolveDashboard({ ...validMetadata, dashboard: { ...validMetadata.dashboard, version: '2.0.0' } }),
    /não suportada/i
  );
});
