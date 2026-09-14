import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const path = new URL('../../docs/betha/gerador-balancete-despesa.groovy', import.meta.url);

test('declares the expense JSON source contract and vision package', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /p_exercicios/);
  assert.match(source, /movimentacaoBalanceteMensalDespesaExercicio\.busca/);
  assert.match(source, /valorPago/);
  assert.match(source, /despesa\.organograma/);
  assert.match(source, /despesa\.funcao/);
  assert.match(source, /despesa\.natureza/);
  assert.match(source, /recursoVinculoDetalhamento/);
  assert.match(source, /meses/);
  assert.match(source, /total/);
  assert.match(source, /balancete-despesa\.json/);
  assert.match(source, /visualizacao\.json/);
  assert.match(source, /visao\.adicionarRelatorio/);
  assert.match(source, /visao\.empacotar/);
});

test('does not return a dynamic source from the adapted generator', async () => {
  const source = await readFile(path, 'utf8');
  assert.doesNotMatch(source, /Dados\.dinamico\.v2\.novo/);
  assert.match(source, /arquivoResultado\.escreverObjeto/);
});
