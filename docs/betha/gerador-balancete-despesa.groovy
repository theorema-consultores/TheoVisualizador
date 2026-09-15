/*
 * Gerador exclusivo do TheoView.
 *
 * Contrato de entrada:
 *   exercicio: exercício atual; o anterior também é consultado.
 *   entidade: entidades selecionadas no relatório.
 *
 * Contrato de saída:
 *   balancete-despesa.json
 *   protocolo da execução
 *
 * A fonte mantém o padrão do Balancete da Receita e usa a visão fornecida
 * pelo ambiente em variaveis.visao.
 */

def utilitarios = Scripts.utilitarios_contabil_cloud.importar()
def siaficIdentificacao = utilitarios.siaficIdentificacao()
def entidadeContexto = contextoExecucao.idEntidade
def protocolo = Execucao.atual.protocolo

if (entidadeContexto == null) {
  suspender("[ERRO] O contexto não informou a entidade.")
}

def exercicio = parametros.exercicio.valor
exercicio = Integer.valueOf("${exercicio}")
def exercicios = [(exercicio - 1), exercicio]

if (exercicios.size() != 2) {
  suspender("[ERRO] Informe exatamente dois exercícios diferentes.")
}

def entidades = parametros?.entidade?.selecionados?.valor ?: []
if (entidades instanceof String) {
  entidades = entidades
    .replaceAll(/[\[\]"]/, "")
    .split(",")
    .collect { it.trim() }
    .findAll { it }
}
entidades = (entidades instanceof Collection ? entidades.toList() : [entidades])
  .findAll { it != null && "${it}".trim() }
  .collect { Integer.valueOf("${it}") }

def entidadesFiltro = entidades ?: [entidadeContexto]

// Valores fixos deste gerador especializado.
final def MES_INICIO = 1
final def MES_FIM = 12
final def COLUNAS = "PAGO"
final def DEMONSTRAR_DESPESAS = "O"
final def VISAO = "O_N2"
final def VERSAO_GERADOR = "2026-09-14-02"

def texto = { value -> value == null ? "" : "${value}".trim() }
def mesesZerados = {
  (1..12).collectEntries { [(it.toString()): 0.0] }
}

def registroRecurso = { item ->
  if (texto(item.tipoRegistro).toUpperCase() == "ORCAMENTO") {
    return item.recurso ?: [:]
  }
  return item.empenho?.recursoVinculoDetalhamento?.recurso ?:
    item.empenho?.recursoVinculo?.recurso ?:
    item.recurso ?: [:]
}

def registroNatureza = { item ->
  if (texto(item.tipoRegistro).toUpperCase() == "ORCAMENTO") {
    return item.despesa?.natureza ?: [:]
  }
  return item.empenho?.natureza ?: item.despesa?.natureza ?: [:]
}

def organogramaNivel2 = { organograma ->
  def atual = organograma ?: [:]
  while (atual?.nivel != null &&
    Integer.valueOf("${atual.nivel}") > 2 && atual.organogramaPai) {
    atual = atual.organogramaPai
  }
  atual
}

def resultados = exercicios.collect { exercicio ->

  imprimir "[GERADOR] Consultando exercício ${exercicio}..."

  def configuracoes = utilitarios.configuracoesCloud(exercicio)
  def configuracao = { nome ->
    def encontrada = configuracoes.find { it.configuracao == nome }
    if (encontrada == null) {
      suspender("[ERRO] Não existe configuração '${nome}' para o exercício ${exercicio}.")
    }
    encontrada
  }

  def mascaraOrganograma = utilitarios.formatacaoMascara(configuracao("ORGANOGRAMA"))
  def mascaraNatureza = utilitarios.formatacaoMascara(configuracao("NATUREZA_DESPESA"))
  def mascaraRecurso = utilitarios.formatacaoMascara(configuracao("RECURSO"))
  def formatar = { mascara, value ->
    def bruto = texto(value)
    bruto ? texto(utilitarios.formatarCampo(mascara, bruto)) : ""
  }

  def criterio = "exercicio.ano = ${exercicio} " +
    "and mes >= ${MES_INICIO} and mes <= ${MES_FIM} " +
    "and entidade.id in (${entidadesFiltro.join(",")})"

  def campos = "entidade(id,nome), mes, tipoRegistro, valorPago, " +
    "despesa(numero, natureza(numero,descricao), funcao(numero,descricao), " +
    "organograma(nivel,numero,descricao,organogramaPai(nivel,numero,descricao, " +
    "organogramaPai(nivel,numero,descricao,organogramaPai(nivel,numero,descricao))))), " +
    "empenho.natureza(numero,descricao), " +
    "recurso(numero,descricao), " +
    "empenho.recursoVinculo.recurso(numero,descricao), " +
    "empenho.recursoVinculoDetalhamento.recurso(numero,descricao)"

  def grupos = [:]

  Dados.contabilidade.v1.movimentacaoBalanceteMensalDespesaExercicio.busca(
    campos: campos,
    criterio: criterio,
    ordenacao: "entidade.id asc, despesa.organograma.numero asc, despesa.natureza.numero asc, mes asc"
  ).each { item ->

    def entidade = item.entidade ?: [:]
    def despesa = item.despesa ?: [:]
    def natureza = registroNatureza(item)
    def funcao = despesa.funcao ?: [:]
    def organograma = organogramaNivel2(despesa.organograma)
    def recurso = registroRecurso(item)
    def chave = [
      entidadeId: entidade.id ?: entidadeContexto,
      entidadeNome: texto(entidade.nome),
      organograma: formatar(mascaraOrganograma, organograma.numero),
      descricaoOrganograma: texto(organograma.descricao),
      funcao: texto(funcao.numero),
      descricaoFuncao: texto(funcao.descricao),
      recurso: formatar(mascaraRecurso, recurso.numero),
      descricaoRecurso: texto(recurso.descricao),
      natureza: formatar(mascaraNatureza, natureza.numero),
      descricao: texto(natureza.descricao)
    ]

    if (!chave.natureza && !chave.descricao) {
      return
    }

    def grupo = grupos[chave]
    if (grupo == null) {
      grupo = [chave: chave, meses: mesesZerados()]
      grupos[chave] = grupo
    }

    def mes = Integer.valueOf("${item.mes}")
    if (mes >= MES_INICIO && mes <= MES_FIM) {
      grupo.meses[mes.toString()] =
        (grupo.meses[mes.toString()] ?: 0.0) + (item.valorPago ?: 0.0)
    }
  }

  def registros = grupos.collect { chave, acumulado ->
    def meses = acumulado.meses
    [
      entidadeId: chave.entidadeId,
      entidadeNome: chave.entidadeNome,
      organograma: chave.organograma,
      descricaoOrganograma: chave.descricaoOrganograma,
      funcao: chave.funcao,
      descricaoFuncao: chave.descricaoFuncao,
      recurso: chave.recurso,
      descricaoRecurso: chave.descricaoRecurso,
      natureza: chave.natureza,
      descricao: chave.descricao,
      valorPago1: meses["1"] ?: 0.0,
      valorPago2: meses["2"] ?: 0.0,
      valorPago3: meses["3"] ?: 0.0,
      valorPago4: meses["4"] ?: 0.0,
      valorPago5: meses["5"] ?: 0.0,
      valorPago6: meses["6"] ?: 0.0,
      valorPago7: meses["7"] ?: 0.0,
      valorPago8: meses["8"] ?: 0.0,
      valorPago9: meses["9"] ?: 0.0,
      valorPago10: meses["10"] ?: 0.0,
      valorPago11: meses["11"] ?: 0.0,
      valorPago12: meses["12"] ?: 0.0,
      totalMeses: meses.values().sum() ?: 0.0
    ]
  }.findAll { registro ->
    (MES_INICIO..MES_FIM).any { mes -> registro["valorPago${mes}"] != 0.0 }
  }.sort { left, right ->
    def a = "${left.organograma}|${left.natureza}|${left.descricao}|${left.recurso}"
    def b = "${right.organograma}|${right.natureza}|${right.descricao}|${right.recurso}"
    a <=> b
  }

  def relatorio = [
    nome: "Balancete da despesa",
    exercicio: exercicio,
    periodo: [
      tipo: "NO",
      mesInicio: MES_INICIO,
      mesFim: MES_FIM
    ],
    colunas: [
      codigo: COLUNAS,
      descricao: "Detalhamento mensal pago"
    ],
    demonstrarDespesas: DEMONSTRAR_DESPESAS,
    visao: VISAO,
    siaficIdentificacao: siaficIdentificacao,
    geradorVersao: VERSAO_GERADOR
  ]

  imprimir "[GERADOR ${VERSAO_GERADOR}] ${exercicio}: " +
    "${registros.size()} registros; total ${registros.sum { it.totalMeses } ?: 0.0}."

  [
    exercicio: exercicio,
    totalRegistros: registros.size(),
    relatorio: relatorio,
    registros: registros
  ]
}

def dadosJson = [
  entidadeId: entidadeContexto,
  entidadeIds: entidadesFiltro,
  exercicios: exercicios,
  quantidadeExercicios: exercicios.size(),
  totalGeralRegistros: resultados.sum { it.totalRegistros } ?: 0,
  resultados: resultados
]

def arquivoResultado = Arquivo.novo("balancete-despesa.json", "json")
arquivoResultado.escreverObjeto(dadosJson)

variaveis.visao.adicionarRelatorio(
  id: "balancete-despesa",
  version: "1.0.0",
  nome: "balancete-despesa.json",
  arquivo: arquivoResultado
)

imprimir "[GERADOR ${VERSAO_GERADOR}] Finalizado: " +
  "${dadosJson.totalGeralRegistros} registros em ${exercicios.size()} exercícios."
imprimir "[GERADOR] Protocolo: ${protocolo}"

retornar protocolo
