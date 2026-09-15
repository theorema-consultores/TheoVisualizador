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

test('declares the expense JSON source contract and vision package', async () => {
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
  assert.match(source, /def visao\s*=\s*\[/);
  assert.match(source, /visualizacao\.json/);
  assert.match(source, /visao\.adicionarRelatorio/);
  assert.match(source, /visao\.empacotar/);
  assert.match(source, /Resultado\.arquivo\(manifesto, "visualizacao\.json"\)/);
  assert.match(source, /id: "balancete-despesa"/);
  assert.doesNotMatch(source, /variaveis\.visao/);
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
  assert.match(source, /empenho\.natureza\(numero,descricao\)/);
});

test('uses the benchmarked annual path required to reproduce paid expense data', async () => {
  const source = await readFile(path, 'utf8');
  const camposDespesa = source.match(
    /def camposDespesa = ([\s\S]*?)\n\n  def camposMovimento/
  )?.[1] ?? '';

  assert.match(
    camposDespesa,
    /organogramaPai\(nivel,numero,descricao\)\)\)\)/
  );
  assert.match(source, /movimentacaoBalanceteMensalDespesa\.busca/);
  assert.doesNotMatch(source, /movimentacaoBalanceteMensalDespesaExercicio\.busca/);
  assert.doesNotMatch(source, /\(MES_INICIO\.\.MES_FIM\)\.each \{ mes ->/);
  assert.match(source, /despesaOrcamentaria\.busca/);
  assert.match(source, /empenhos\.busca/);
  assert.match(source, /despesa\.id/);
  assert.match(source, /empenho\.id/);
  assert.match(source, /empenho\.exercicio\.ano/);
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
