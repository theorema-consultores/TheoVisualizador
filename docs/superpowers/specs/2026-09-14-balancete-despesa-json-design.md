# Gerador JSON do Balancete da Despesa

## Objetivo

Criar uma fonte Betha especializada que transforme a movimentação mensal paga
da despesa no contrato JSON usado pelo TheoView. A primeira fase não altera o
dashboard: entrega o arquivo de dados e o manifesto de visão para que as
visualizações sejam implementadas depois.

O arquivo `pasted-text.txt` e os CSVs fornecidos são referências de código e
formato. As regras desta especificação vêm do pedido do usuário e do padrão já
implementado no gerador do Balancete da Receita.

## Escopo

Incluído:

- novo gerador `theo_view.balancete_despesa`;
- seleção de exatamente dois exercícios;
- despesas orçamentárias no modelo `PAGO`;
- período fixo de janeiro a dezembro;
- agregação mensal por registro analítico;
- preservação das dimensões necessárias às visões do dashboard;
- empacotamento de `balancete-despesa.json` e `visualizacao.json` por uma
  visão.

Fora desta fase:

- alteração do dashboard JavaScript;
- registro do dashboard no frontend;
- emissão/notificação com link;
- despesas extraorçamentárias;
- filtros opcionais da fonte legada que não são necessários para o contrato
  inicial.

## Mapeamento da fonte legada

O gerador consulta a fonte equivalente ao caminho mensal usado pela fonte
antiga (`movimentacaoBalanceteMensalDespesaExercicio`) e fixa a semântica do
relatório antigo: `Demonstrar despesas = Orçamentárias`, `Modelo = Pago` e
`Colunas = Detalhamento mensal pago`.

| CSV/dashboard | Origem legada | JSON novo |
| --- | --- | --- |
| Organograma Nível 2 | `despesa.organograma.numero` e `descricao` | `organograma` e `descricaoOrganograma` |
| Função | `despesa.funcao.numero` | `funcao` |
| Recurso (Executado) | `recurso` para orçamento; `empenho.recursoVinculoDetalhamento.recurso` ou `empenho.recursoVinculo.recurso` para execução | `recurso` e `descricaoRecurso` |
| Natureza da despesa (Executada) | `despesa.natureza.numero` | `natureza` |
| Descrição | `despesa.natureza.descricao` | `descricao` |
| Mês | `mes` | índice de `meses` |
| Valor pago | `valorPago` | valor correspondente em `meses` |
| Total | soma de `valorPago` mensal | `total` |
| Entidade | `entidade.id` e `entidade.nome` | `entidadeId` e `entidadeNome` |

O recurso será selecionado com a mesma precedência da fonte legada: para
registro orçamentário, usa-se `recurso`; para movimento executado, primeiro
`empenho.recursoVinculoDetalhamento.recurso` e depois
`empenho.recursoVinculo.recurso`. Se nenhuma vinculação estiver disponível, o
registro usa `recurso` como fallback. Assim o JSON mantém uma única dimensão
`recurso`, mas não perde a semântica de “Recurso (Executado)”.

## Contrato JSON

O gerador produzirá `balancete-despesa.json` com a mesma estrutura externa do
gerador da receita:

```json
{
  "entidadeId": 819,
  "entidadeIds": [819],
  "exercicios": [2025, 2026],
  "quantidadeExercicios": 2,
  "totalGeralRegistros": 2432,
  "resultados": [
    {
      "exercicio": 2025,
      "totalRegistros": 1302,
      "relatorio": {
        "nome": "Balancete da despesa",
        "exercicio": 2025,
        "periodo": { "tipo": "NO", "mesInicio": 1, "mesFim": 12 },
        "colunas": { "codigo": "PAGO", "descricao": "Detalhamento mensal pago" },
        "demonstrarDespesas": "O",
        "visao": "O_N2"
      },
      "registros": [
        {
          "entidadeId": 819,
          "entidadeNome": "Prefeitura",
          "organograma": "02.001",
          "descricaoOrganograma": "Câmara",
          "funcao": "04",
          "descricaoFuncao": "Administração",
          "recurso": "00000-00000.01.07.00.00.1.500.0000",
          "descricaoRecurso": "Recursos Ordinários",
          "natureza": "3.1.90.11.43.02.00.00",
          "descricao": "13º SALÁRIO - PREFEITO",
          "meses": [22427.45, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          "total": 22427.45
        }
      ]
    }
  ]
}
```

Os valores serão números em reais, não centavos nem textos formatados. Os
registros serão mantidos somente quando houver algum valor pago mensal
diferente de zero. A ordem dos exercícios será crescente; exercícios
duplicados ou diferentes de dois serão rejeitados.

O registro conserva todas as dimensões do CSV mesmo quando a visão inicial é
`O_N2`. Isso permite que o dashboard derive as visões por natureza, recurso,
organograma, função, categoria econômica e grupo de natureza sem pedir nova
emissão.

## Visão e empacotamento

O gerador terá uma visão local com o mesmo comportamento de
`gerador-balancete-receita.groovy`:

1. validar e registrar o relatório `balancete-despesa`;
2. criar `visualizacao.json` com `schemaVersion: "1.0.0"`, visão
   `visao-contabil` e o arquivo do relatório;
3. adicionar o manifesto e o JSON ao resultado da execução.

O manifesto usará:

```json
{
  "schemaVersion": "1.0.0",
  "visao": {
    "id": "visao-contabil",
    "nome": "Visão Contábil",
    "relatorios": [
      {
        "id": "balancete-despesa",
        "version": "1.0.0",
        "arquivo": "balancete-despesa.json"
      }
    ]
  }
}
```

## Validação e erros

- O contexto deve informar uma entidade.
- O parâmetro `p_exercicios` deve resultar em dois exercícios inteiros
  diferentes.
- Configurações de natureza, recurso e organograma ausentes devem interromper
  a execução com mensagem explícita.
- Campos obrigatórios de dimensão serão normalizados como texto; valores
  monetários ausentes serão zero somente quando a própria fonte Betha os
  retornar nulos.
- Falhas da consulta serão encaminhadas ao mecanismo de notificação de erro da
  fonte, como na implementação legada.

## Verificação

Como o runtime `Dados.contabilidade` não está disponível no Node local, a
entrega terá uma verificação automatizada do contrato textual do gerador e
uma checagem de sintaxe JavaScript do projeto. A validação real dos valores
será feita na primeira execução Betha com os dois exercícios dos CSVs,
comparando quantidade de registros, totais mensais e dimensões contra os
arquivos de referência.
