import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveReport } from '../../src/core/resolver.js';

const protocol = '6b4bec10-8f6f-47cd-b587-8b8958d5e25b';
const metadata = { schemaVersion: '1.0.0', dashboard: { id: 'balancete-receita', version: '1.0.0' } };

test('stores a ZIP and navigates to the dashboard without protocol in the target URL', async () => {
  const values = new Map();
  let target;
  const result = await resolveReport({
    search: `?protocolo=${protocol}`,
    session: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    download: async () => new Uint8Array([1]),
    openArchive: () => ({ readText: () => JSON.stringify(metadata) }),
    transferStore: { cleanup: async () => {}, put: async () => 'transfer-id' },
    navigate: value => { target = value; }
  });
  assert.equal(result.page, 'dashboards/balancete-receita/');
  assert.equal(values.get('report.protocol'), protocol);
  assert.equal(values.get('report.transferId'), 'transfer-id');
  assert.equal(target, 'dashboards/balancete-receita/');
});
