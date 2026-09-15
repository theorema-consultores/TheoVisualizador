import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const path = new URL('../../docs/betha/gerador-balancete-despesa.groovy', import.meta.url);
const optimizedPath = new URL(
  '../../docs/betha/gerador-balancete-despesa-otimizado-teste.groovy',
  import.meta.url
);
const fallbackPath = new URL(
  '../../docs/betha/gerador-balancete-despesa-otimizado-fallback-teste.groovy',
  import.meta.url
);

test('declares the expense JSON source contract and registers in the caller vision', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /parametros\?\.p_exercicio\?\.valor/);
  assert.match(source, /parametros\?\.exercicio\?\.valor/);
  assert.match(source, /exercicios\s*=\s*\[\(exercicio - 1\), exercicio\]/);
  assert.match(source, /parametros\?\.p_entidadeId\?\.valor/);
  assert.match(source, /parametros\?\.entidade\?\.selecionados\?\.valor/);
  assert.match(source, /valorPago/);
  assert.match(source, /despesa\.organograma/);
  assert.match(source, /despesa\.funcao/);
  assert.match(source, /despesa\.natureza/);
  assert.match(source, /recursoVinculoDetalhamento/);
  assert.match(source, /valorPago1/);
  assert.match(source, /valorPago12/);
  assert.match(source, /totalMeses/);
  assert.match(source, /balancete-despesa\.json/);
  assert.match(source, /variaveis\.visao\.adicionarRelatorio/);
  assert.match(source, /id: "balancete-despesa"/);
  assert.doesNotMatch(source, /def visao\s*=\s*\[/);
  assert.doesNotMatch(source, /visao\.empacotar/);
  assert.doesNotMatch(source, /Resultado\.arquivo/);
  assert.doesNotMatch(source, /notificacoesUtil\.setMsgError/);
});

test('does not return a dynamic source from the adapted generator', async () => {
  const source = await readFile(path, 'utf8');
  assert.doesNotMatch(source, /Dados\.dinamico\.v2\.novo/);
  assert.match(source, /arquivoResultado\.escreverObjeto/);
});

test('loads hierarchy levels and the legacy executed-nature fallback', async () => {
  const source = await readFile(path, 'utf8');
  assert.ok((source.match(/organogramaPai\(nivel/g) || []).length >= 3);
  assert.match(source, /def camposEmpenho = "id, natureza\(id,numero,descricao\)/);
  assert.match(source, /empenho\?\.natureza/);
});

test('uses the legacy exercise source with the complete movement projection', async () => {
  const source = await readFile(path, 'utf8');
  const camposDespesa = source.match(
    /def camposDespesa = ([\s\S]*?)\n\n  def camposMovimento/
  )?.[1] ?? '';
  const camposMovimento = source.match(
    /def camposMovimento = ([\s\S]*?)\n\n  def camposEmpenho/
  )?.[1] ?? '';

  assert.match(
    camposDespesa,
    /organogramaPai\(nivel,numero,descricao\)\)\)\)/
  );
  assert.match(source, /movimentacaoBalanceteMensalDespesaExercicio\.busca/);
  assert.doesNotMatch(source, /movimentacaoBalanceteMensalDespesa\.busca/);
  assert.match(source, /\(MES_INICIO\.\.MES_FIM\)\.each \{ mes ->/);
  assert.match(source, /" and mes = " \+ mes/);
  assert.match(source, /parametros: \[exercicio: ano\]/);
  assert.doesNotMatch(source, /" and mes >= " \+ MES_INICIO/);
  assert.doesNotMatch(source, /" and mes <= " \+ MES_FIM/);
  assert.match(source, /despesaOrcamentaria\.busca/);
  assert.match(source, /empenhos\.busca/);
  assert.match(camposMovimento, /entidade\(id,nome\)/);
  assert.match(camposMovimento, /despesa\.id/);
  assert.match(camposMovimento, /empenho\.id/);
  assert.match(camposMovimento, /despesa\(organograma\(nivel,numero,descricao/);
  assert.match(camposMovimento, /empenho\.natureza\(numero,descricao\)/);
  assert.match(camposMovimento, /recurso\(id,numero,descricao,superavitFinanceiro\)/);
  assert.match(camposMovimento, /valorPago, mes, tipoRegistro, despesa\.natureza\.nivel/);
  assert.match(camposMovimento, /empenho\.recursoVinculoDetalhamento\.recurso/);
});

test('trial source loads all months in one query per entity and year', async () => {
  const source = await readFile(optimizedPath, 'utf8').catch(() => '');

  assert.match(source, /def buscarMovimentosAno\s*=/);
  assert.match(source, /" and mes >= " \+ MES_INICIO/);
  assert.match(source, /" and mes <= " \+ MES_FIM/);
  assert.doesNotMatch(source, /\(MES_INICIO\.\.MES_FIM\)\.each \{ mes ->/);
  assert.match(source, /balancete-despesa-otimizado-teste\.json/);
});

test('fallback trial skips the failed annual API and notification wrapper', async () => {
  const source = await readFile(fallbackPath, 'utf8').catch(() => '');

  assert.match(source, /def buscarMovimentosAno\s*=/);
  assert.match(source, /movimentacaoBalanceteMensalDespesa\.busca/);
  assert.doesNotMatch(source, /movimentacaoBalanceteMensalDespesaExercicio\.busca/);
  assert.doesNotMatch(source, /notificacoesUtil\.setMsgError/);
  assert.doesNotMatch(source, /catch \(Exception/);
  assert.match(source, /balancete-despesa-otimizado-fallback-teste\.json/);
});
