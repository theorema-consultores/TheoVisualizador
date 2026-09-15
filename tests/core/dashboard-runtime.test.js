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

test('passes the loaded municipality to the visualization navigation', async () => {
  const bytes = zipOf({
    'visualizacao.json': '{"schemaVersion":"1.0.0","dashboard":{"id":"balancete-receita","version":"1.0.0"}}'
  });
  let entityName;

  await startDashboard({
    id: 'balancete-receita',
    version: '1.0.0',
    bytes,
    session: { getItem: () => 'protocol' },
    transferStore: { take: async () => bytes },
    download: async () => { throw new Error('download should not be called'); },
    load: async () => ({ entityName: 'Prefeitura de Sertaneja' }),
    render: () => {},
    container: {},
    onVisualizations: ({ municipality }) => { entityName = municipality; }
  });

  assert.equal(entityName, 'Prefeitura de Sertaneja');
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

test('switches to the dashboard selected in a multi-report vision', async () => {
  const dom = new (await import('jsdom')).JSDOM('<main id="app"></main>');
  const container = dom.window.document.getElementById('app');
  const expenseRecord = {
    natureza: '3.1.90.11', descricao: 'Vencimentos', totalMeses: 20,
    ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`valorPago${index + 1}`, index === 0 ? 20 : 0]))
  };
  const bytes = zipOf({
    'visualizacao.json': JSON.stringify({ schemaVersion: '1.0.0', visao: {
      id: 'visao-contabil', nome: 'Visão Contábil', relatorios: [
        { id: 'balancete-receita', version: '1.0.0', arquivo: 'receita.json' },
        { id: 'balancete-despesa', version: '1.0.0', arquivo: 'despesa.json' }
      ]
    } }),
    'despesa.json': JSON.stringify({ resultados: [
      { exercicio: 2025, registros: [{ ...expenseRecord, totalMeses: 10, valorPago1: 10 }] },
      { exercicio: 2026, registros: [expenseRecord] }
    ] })
  });
  let select;

  await startDashboard({
    id: 'balancete-receita', version: '1.0.0', bytes,
    session: { getItem: () => 'protocol' },
    transferStore: { take: async () => bytes },
    download: async () => { throw new Error('download should not be called'); },
    load: async () => ({}), render: () => {}, container,
    onVisualizations: ({ select: choose }) => { select = choose; }
  });
  await select(1);

  assert.match(container.textContent, /Dashboard Comparativo de Balancete da Despesa/);
  assert.match(container.textContent, /Vencimentos/);
});
