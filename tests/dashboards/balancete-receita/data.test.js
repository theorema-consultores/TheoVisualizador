import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBalancete, parseResource, formatVariation } from '../../../src/dashboards/balancete-receita/data.js';
import { GLOSSARY } from '../../../src/dashboards/balancete-receita/glossary.js';

const record = (year, overrides = {}) => ({
  tipoNatureza: 'A', numeroNaturezaReceita: '1.1.1', descNaturezaReceita: 'Receita',
  numeroRecurso: '1.500.01.02.03.04', entidadeNome: 'Prefeitura', totalMeses: year,
  ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`valorRealizado${index + 1}`, index + 1])),
  ...overrides
});

test('keeps analytical records and orders exercises', async () => {
  const archive = { findByBasename: () => ['balancete-receita.json'], readJson: () => ({ resultados: [
    { exercicio: 2025, registros: [record(2025), record(2025, { tipoNatureza: 'S' })] },
    { exercicio: 2024, registros: [record(2024)] }
  ] }) };
  const model = await loadBalancete(archive);
  assert.equal(model.previousYear, 2024);
  assert.equal(model.currentYear, 2025);
  assert.equal(model.current.length, 1);
  assert.equal(model.entityName, 'Prefeitura');
});

test('extracts execution user, issue times and protocol from the real report metadata', async () => {
  const archive = { findByBasename: () => ['balancete-receita.json'], readJson: () => ({ resultados: [
    {
      exercicio: 2026,
      relatorio: { siaficIdentificacao: 'Sistema Contábil - Betha Sistemas. Usuário: brunotheorema. Emissão: 08/09/2026, às 21:12:32. Protocolo: ' },
      registros: [record(2026)]
    },
    {
      exercicio: 2025,
      relatorio: { siaficIdentificacao: 'Sistema Contábil - Betha Sistemas. Usuário: brunotheorema. Emissão: 08/09/2026, às 21:11:49. Protocolo: ' },
      registros: [record(2025)]
    }
  ] }) };

  const model = await loadBalancete(archive, { protocol: '51dcd516-cbe2-4e35-9366-20a6b65e5af5' });

  assert.deepEqual(model.execution, {
    protocol: '51dcd516-cbe2-4e35-9366-20a6b65e5af5',
    user: 'brunotheorema',
    issues: [
      { year: 2025, dateTime: '08/09/2026, às 21:11:49' },
      { year: 2026, dateTime: '08/09/2026, às 21:12:32' }
    ]
  });
});

test('uses fallback components for incomplete resource codes', () => {
  assert.deepEqual(parseResource('1.500'), { origem: '99', aplicacao: '99', desdobramento: '00', detalhamento: '00' });
});

test('marks a zero-base percentage variation as not applicable', () => {
  assert.equal(formatVariation(20, 0), '—');
});

test('includes the complete legacy resource glossary', () => {
  assert.equal(GLOSSARY.origem['14'], 'Cessão Onerosa – Pré-Sal');
  assert.equal(GLOSSARY.aplicacao['06'], 'SUAS');
  assert.equal(GLOSSARY.desdobramento['07'], 'Programas/Transferências Voluntárias Anteriores a 2013 Reclassificados');
  assert.equal(GLOSSARY.detalhamento['27'], 'PAS – Programa Único de Assistência - Deliberação n° 59/2023 do CEAS/PR');
});
