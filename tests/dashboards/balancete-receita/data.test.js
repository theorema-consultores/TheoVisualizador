import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBalancete, parseResource, formatVariation } from '../../../src/dashboards/balancete-receita/data.js';

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

test('uses fallback components for incomplete resource codes', () => {
  assert.deepEqual(parseResource('1.500'), { origem: '99', aplicacao: '99', desdobramento: '00', detalhamento: '00' });
});

test('marks a zero-base percentage variation as not applicable', () => {
  assert.equal(formatVariation(20, 0), '—');
});
