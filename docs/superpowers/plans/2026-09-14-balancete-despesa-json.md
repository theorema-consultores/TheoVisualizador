# Balancete da Despesa JSON Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fonte Betha `theo_view.balancete_despesa` que empacota dois exercícios pagos em `balancete-despesa.json` e `visualizacao.json`.

**Architecture:** Um único gerador Groovy especializado consulta `movimentacaoBalanceteMensalDespesaExercicio`, preserva as dimensões do CSV e agrega `valorPago` por mês e chave analítica. Uma visão local, igual à do gerador de receita, registra o relatório e empacota o manifesto sem alterar o frontend nesta fase.

**Tech Stack:** Groovy da plataforma Betha, APIs `Dados.contabilidade`, `Arquivo`, `Resultado`, Node.js `node:test` para contrato estático local.

**Spec:** `docs/superpowers/specs/2026-09-14-balancete-despesa-json-design.md`

## Global Constraints

- O arquivo de dados será `balancete-despesa.json`.
- O manifesto usará `schemaVersion: "1.0.0"`, visão `visao-contabil` e relatório `balancete-despesa@1.0.0`.
- O gerador aceitará exatamente dois exercícios inteiros diferentes em `p_exercicios`.
- O período será fixo de janeiro a dezembro, com `Demonstrar despesas = Orçamentárias`, `Modelo = Pago` e `Colunas = Detalhamento mensal pago`.
- Os valores JSON serão números em reais; `meses` terá doze posições e `total` será sua soma.
- Registros sem qualquer valor pago mensal diferente de zero serão descartados.
- O registro manterá organograma nível 2, função, recurso executado, natureza executada, descrição, entidade e valores mensais.
- Nenhuma alteração de dashboard, registro frontend, emissor ou dependência npm faz parte desta fase.

## File Map

- Create: `docs/betha/gerador-balancete-despesa.groovy` — fonte Betha especializada, consulta, agregação, contrato JSON e empacotamento da visão.
- Create: `tests/betha/gerador-balancete-despesa.test.js` — verificação local do contrato textual enquanto o runtime `Dados.contabilidade` não está disponível.

### Task 1: Add the failing source contract test

**Files:**
- Create: `tests/betha/gerador-balancete-despesa.test.js`
- Test target: `docs/betha/gerador-balancete-despesa.groovy`

**Interfaces:**
- Consumes: o caminho do novo gerador e seu texto.
- Produces: uma trava local para o nome da fonte, consulta, mapeamento, agregação e empacotamento.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/betha/gerador-balancete-despesa.test.js`

Expected: FAIL because `docs/betha/gerador-balancete-despesa.groovy` does not exist yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/betha/gerador-balancete-despesa.test.js
git commit -m "test: define balancete despesa JSON source contract"
```

### Task 2: Implement the specialized Betha JSON generator

**Files:**
- Create: `docs/betha/gerador-balancete-despesa.groovy`

**Interfaces:**
- Consumes: `parametros.p_exercicios`, `contextoExecucao.idEntidade`, `Execucao.atual.protocolo` and Betha expense movement data.
- Produces: `balancete-despesa.json`, `visualizacao.json` and the execution protocol.

- [ ] **Step 1: Add the vision packaging closure**

Use the same minimal vision contract already used by the revenue generator:

```groovy
def visao = [
    relatorios: [],
    temasSemLicenca: [],
    adicionarRelatorio: { Map relatorio ->
        if (!relatorio.id || !relatorio.version || !relatorio.nome || !relatorio.arquivo) {
            throw new IllegalArgumentException("Relatório da visão exige id, version, nome e arquivo.")
        }
        visao.relatorios << [id: relatorio.id, version: relatorio.version, arquivo: relatorio.nome, objeto: relatorio.arquivo]
    },
    empacotar: {
        if (!visao.relatorios) throw new IllegalStateException("A visão deve possuir pelo menos um relatório.")
        def manifesto = Arquivo.novo("visualizacao.json", "json")
        manifesto.escreverObjeto([
            schemaVersion: "1.0.0",
            visao: [
                id: "visao-contabil",
                nome: "Visão Contábil",
                temasSemLicenca: visao.temasSemLicenca,
                relatorios: visao.relatorios.collect { [id: it.id, version: it.version, arquivo: it.arquivo] }
            ]
        ])
        Resultado.arquivo(manifesto, "visualizacao.json")
        visao.relatorios.each { item -> Resultado.arquivo(item.objeto, item.arquivo) }
    }
]
```

- [ ] **Step 2: Normalize parameters and validate the execution context**

Read `p_exercicios` as list or comma-separated text, convert to integers,
remove duplicates, sort and reject anything other than two years. Use only the
current entity from `contextoExecucao.idEntidade` and reject a missing context.

```groovy
def entidadeId = contextoExecucao.idEntidade
if (entidadeId == null) suspender("[ERRO] O contexto não informou a entidade.")

def valorExercicios = parametros.p_exercicios?.selecionados?.valor ?: []
if (valorExercicios instanceof String) {
    valorExercicios = valorExercicios.replaceAll(/[\[\]"]/, "").split(",").collect { it.trim() }.findAll { it }
}
def exercicios = (valorExercicios instanceof Collection ? valorExercicios.toList() : [valorExercicios])
    .collect { Integer.valueOf("${it}") }.unique().sort()
if (exercicios.size() != 2) suspender("[ERRO] Informe exatamente dois exercícios diferentes.")
```

- [ ] **Step 3: Query and map the legacy dimensions**

For each exercise, obtain the three masks from `utilitarios.configuracoesCloud`
and reject a missing configuration. Query the fields needed by the legacy
mapping, including the level-parent chain for the organogram and both resource
vinculation paths:

```groovy
def campos = "entidade(id,nome), mes, tipoRegistro, valorPago, " +
    "despesa(numero, natureza(numero,descricao), funcao(numero,descricao), " +
    "organograma(nivel,numero,descricao,organogramaPai(numero,descricao, " +
    "organogramaPai(numero,descricao,organogramaPai(numero,descricao))))), " +
    "recurso(numero,descricao), " +
    "empenho.recursoVinculo.recurso(numero,descricao), " +
    "empenho.recursoVinculoDetalhamento.recurso(numero,descricao)"

Dados.contabilidade.v1.movimentacaoBalanceteMensalDespesaExercicio.busca(
    criterio: "exercicio.ano = ${exercicio} and mes >= 1 and mes <= 12 and entidade.id = ${entidadeId}",
    campos: campos,
    ordenacao: "despesa.organograma.numero asc, despesa.natureza.numero asc, mes asc"
).each { item ->
    // map the item into the aggregation below
}
```

Derive the level-2 organogram by walking `organogramaPai` while `nivel > 2`.
Select the executed resource with the legacy precedence: budget record uses
`recurso`; other records use `empenho.recursoVinculoDetalhamento.recurso`,
then `empenho.recursoVinculo.recurso`, then `recurso`. Format organogram,
nature and resource numbers with the configured masks; keep the corresponding
descriptions as text.

- [ ] **Step 4: Aggregate paid values by the complete dashboard key**

Use a map keyed by entity, level-2 organogram, function, executed resource,
executed nature and description. Add `valorPago` at `mes - 1` in a twelve-item
array. Do not group by `p_visao`: keeping every CSV dimension is what allows
the later dashboard to derive all views from one emission.

```groovy
def mesesZerados = { (1..12).collect { 0.0 } }
def grupos = [:]

def adicionar = { Map chave, item ->
    def grupo = grupos[chave]
    if (grupo == null) {
        grupo = [chave: chave, meses: mesesZerados()]
        grupos[chave] = grupo
    }
    grupo.meses[Integer.valueOf("${item.mes}") - 1] += item.valorPago ?: 0.0
}
```

Convert groups to records with `meses` and `total`, filtering only rows where
at least one month is nonzero. Preserve `entidadeId` and `entidadeNome` in
each record and sort deterministically by organogram, nature and description.

- [ ] **Step 5: Write the result object and package the vision**

For each exercise create `relatorio` with `periodo.tipo = "NO"`,
`mesInicio = 1`, `mesFim = 12`, `colunas.codigo = "PAGO"`,
`colunas.descricao = "Detalhamento mensal pago"`, `demonstrarDespesas = "O"`,
`visao = "O_N2"`, `siaficIdentificacao` and a generator version.

Write the outer object and package it:

```groovy
def dadosJson = [
    entidadeId: entidadeId,
    entidadeIds: [entidadeId],
    exercicios: exercicios,
    quantidadeExercicios: 2,
    totalGeralRegistros: resultados.sum { it.totalRegistros } ?: 0,
    resultados: resultados
]

def arquivoResultado = Arquivo.novo("balancete-despesa.json", "json")
arquivoResultado.escreverObjeto(dadosJson)
visao.adicionarRelatorio(
    id: "balancete-despesa",
    version: "1.0.0",
    nome: "balancete-despesa.json",
    arquivo: arquivoResultado
)
visao.empacotar()
retornar protocolo
```

- [ ] **Step 6: Add legacy-style error routing**

Wrap the generator body in `try/catch` and route failures through
`bth.contabil.utilitarios.notifica.execucao` with `tipo: "BALANCETE-DESP"`
and `isMsgApp: true`, then call `suspender` with the original error text.
Do not catch and turn a failed query into an empty result.

- [ ] **Step 7: Run the contract test to verify it passes**

Run: `node --test tests/betha/gerador-balancete-despesa.test.js`

Expected: PASS with both tests green.

- [ ] **Step 8: Commit the generator**

```bash
git add docs/betha/gerador-balancete-despesa.groovy tests/betha/gerador-balancete-despesa.test.js
git commit -m "feat: add balancete despesa JSON generator"
```

### Task 3: Run repository verification

**Files:**
- Read: `docs/superpowers/specs/2026-09-14-balancete-despesa-json-design.md`
- Read: `docs/betha/gerador-balancete-despesa.groovy`

**Interfaces:**
- Consumes: the committed generator and contract test.
- Produces: fresh evidence for syntax, tests, build and whitespace integrity.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: exit code 0 and all tests pass.

- [ ] **Step 2: Run JavaScript syntax checks**

Run: `npm run check`

Expected: exit code 0 for every JavaScript file under `src` and `scripts`.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit code 0; the existing `dist` output remains valid and no report
data is added to the repository.

- [ ] **Step 4: Check the final diff**

Run: `git diff --check HEAD~2..HEAD; git status --short`

Expected: no whitespace errors and no untracked report CSV, HTML or JSON data.

