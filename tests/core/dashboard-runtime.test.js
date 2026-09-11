import assert from 'node:assert/strict';
import test from 'node:test';
import { startDashboard } from '../../src/core/dashboard-runtime.js';
import { zipOf } from '../helpers/zip.js';

test('passes the stored protocol to the dashboard data loader', async () => {
  const protocol = '51dcd516-cbe2-4e35-9366-20a6b65e5af5';
  const bytes = zipOf({
    'visualizacao.json': '{"schemaVersion":"1.0.0","dashboard":{"id":"balancete-receita","version":"1.0.0"}}'
  });
  let context;

  await startDashboard({
    id: 'balancete-receita',
    version: '1.0.0',
    session: { getItem: key => key === 'report.transferId' ? 'transfer' : protocol },
    transferStore: { take: async () => bytes },
    download: async () => { throw new Error('download should not be called'); },
    load: async (_archive, receivedContext) => { context = receivedContext; return {}; },
    render: () => {},
    container: {}
  });

  assert.deepEqual(context, { protocol });
});

test('passes the selected visualization and total to the dashboard loader', async () => {
  const bytes = zipOf({
    'visualizacao.json': '[{"schemaVersion":"1.0.0","dashboard":{"id":"balancete-receita","version":"1.0.0"}},{"schemaVersion":"1.0.0","dashboard":{"id":"balancete-receita","version":"1.0.0"}}]'
  });
  let context;
  await startDashboard({
    id: 'balancete-receita', version: '1.0.0', visualizationIndex: 1,
    session: { getItem: key => key === 'report.transferId' ? 'transfer' : 'protocol' },
    transferStore: { take: async () => bytes }, download: async () => { throw new Error('download should not be called'); },
    load: async (_archive, receivedContext) => { context = receivedContext; return {}; }, render: () => {}, container: {}
  });
  assert.deepEqual(context, { protocol: 'protocol', visualizationIndex: 1, visualizationCount: 2 });
});
