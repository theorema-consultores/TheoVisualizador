import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBalanceteDespesa } from '../../../src/dashboards/balancete-despesa/data.js';

const months = values => Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => [`valorPago${index + 1}`, values[index] ?? 0])
);

const record = (total, overrides = {}) => ({
  entidadeNome: 'Prefeitura',
  organograma: '02.001',
  descricaoOrganograma: 'Gabinete',
  funcao: '04',
  descricaoFuncao: 'Administração',
  recurso: '',
  descricaoRecurso: '',
  natureza: '3.1.90.11.01.01.00.00',
  descricao: 'Vencimentos',
  totalMeses: total,
  ...months([total]),
  ...overrides
});

const archive = resultados => ({
  findByBasename: () => ['balancete-despesa.json'],
  readJson: () => ({ resultados })
});

test('loads two expense years and keeps the generated dimensions', async () => {
  const model = await loadBalanceteDespesa(archive([
    { exercicio: 2026, registros: [record(250, { valorPago9: 50 })] },
    { exercicio: 2025, registros: [record(200)] }
  ]));

  assert.equal(model.previousYear, 2025);
  assert.equal(model.currentYear, 2026);
  assert.equal(model.current[0].natureza, '3.1.90.11.01.01.00.00');
  assert.equal(model.current[0].months[8], 50);
  assert.equal(model.current[0].resource, 'Não informado');
});

test('rejects nonnumeric expense totals and monthly values', async () => {
  await assert.rejects(
    () => loadBalanceteDespesa(archive([
      { exercicio: 2025, registros: [record('200')] },
      { exercicio: 2026, registros: [record(300, { valorPago1: '300' })] }
    ])),
    /deve ser numérico/
  );
});
