/*
 * Gerador exclusivo do TheoView.
 *
 * Gera a visão do detalhamento mensal pago:
 * Organograma nível 2, Função, Recurso executado e Natureza executada.
 *
 * Saída:
 *   balancete-despesa.json
 *   registro na visão do chamador
 */

  def utilitarios = Scripts.utilitarios_contabil_cloud.importar()
  def siaficIdentificacao = utilitarios.siaficIdentificacao()
  def entidadeContexto = contextoExecucao?.idEntidade
  def protocolo = Execucao.atual.protocolo

  // O contrato legado é prioritário; os nomes da fonte de receita continuam
  // aceitos para permitir a emissão pelo TheoView.
  def valorExercicio = parametros?.p_exercicio?.valor ?:
    parametros?.exercicio?.valor
  if (valorExercicio == null) {
    suspender("[ERRO] Informe o exercício.")
  }

  def exercicio = Integer.valueOf(String.valueOf(valorExercicio))
  def exercicios = [(exercicio - 1), exercicio]
  def valorEntidades = parametros?.p_entidadeId?.valor ?:
    parametros?.entidade?.selecionados?.valor ?: []

  def normalizarEntidades = { valor ->
    if (valor instanceof String) {
      valor = valor
        .replace('[', '')
        .replace(']', '')
        .replace('"', '')
        .split(',')
        .collect { it.trim() }
        .findAll { it }
    }

    (valor instanceof Collection ? valor.toList() : [valor])
      .findAll { it != null && String.valueOf(it).trim() }
      .collect { Integer.valueOf(String.valueOf(it)) }
  }

  def entidadesFiltro = normalizarEntidades(valorEntidades)
  if (!entidadesFiltro && entidadeContexto != null) {
    entidadesFiltro = [entidadeContexto]
  }
  if (!entidadesFiltro) {
    entidadesFiltro = Dados.contabilidade.v1.entidades
      .busca(campos: "id", criterio: "id != 0")
      .collect { it.id }
  }
  if (!entidadesFiltro) {
    suspender("[ERRO] Nenhuma entidade foi informada.")
  }

  final def MES_INICIO = 1
  final def MES_FIM = 12
  final def VERSAO_GERADOR = "2026-09-14-08"

  def texto = { value -> value == null ? "" : String.valueOf(value).trim() }
  def mesesZerados = {
    (MES_INICIO..MES_FIM).collectEntries { [(String.valueOf(it)): 0.0] }
  }

  def organogramaNivel2 = { organograma ->
    def atual = organograma ?: [:]
    while (atual?.nivel != null &&
      Integer.valueOf(String.valueOf(atual.nivel)) > 2 &&
      atual.organogramaPai) {
      atual = atual.organogramaPai
    }
    atual
  }

  def camposDespesa = "id, numero, funcao(numero,descricao), " +
    "natureza(id,numero,nivel,descricao), " +
    "organograma(nivel,numero,descricao,organogramaPai(nivel,numero,descricao, " +
    "organogramaPai(nivel,numero,descricao,organogramaPai(nivel,numero,descricao))))"

  def camposMovimento = "id, entidade(id,nome), despesa.id, empenho.id, " +
    "empenho.exercicio.ano, despesa.organograma(numero,descricao), " +
    "despesa(organograma(nivel,numero,descricao,organogramaPai(nivel,numero,descricao, " +
    "organogramaPai(nivel,numero,descricao,organogramaPai(nivel,numero,descricao))))), " +
    "despesa.funcao(numero,descricao), despesa.natureza(numero,descricao), " +
    "empenho.natureza(numero,descricao), recurso(id,numero,descricao,superavitFinanceiro), " +
    "valorPago, mes, tipoRegistro, despesa.natureza.nivel, " +
    "empenho.recursoVinculo.recurso(id,numero,descricao,superavitFinanceiro), " +
    "empenho.recursoVinculoDetalhamento.recurso(id,numero,descricao,superavitFinanceiro)"

  def camposEmpenho = "id, natureza(id,numero,descricao), exercicio.ano, " +
    "recursoVinculo.recurso(id,numero,descricao,superavitFinanceiro), " +
    "recursoVinculoDetalhamento.recurso(id,numero,descricao,superavitFinanceiro)"

  def carregarDespesas = { ano ->
    def despesas = [:]

    entidadesFiltro.each { entidade ->
      def criterio = "loa.exercicio.ano = " + ano +
        " and entidade.id in (" + entidade + ")"

      Dados.contabilidade.v1.despesaOrcamentaria.busca(
        campos: camposDespesa,
        criterio: criterio
      ).each { despesa ->
        despesas[despesa.id] = despesa
      }

      Dados.contabilidade.v1.despesasNaoPrevistas.busca(
        campos: camposDespesa,
        criterio: criterio
      ).each { despesa ->
        despesas[despesa.id] = despesa
      }
    }

    despesas
  }

  def buscarMovimentosAno = { ano, entidade ->
    def movimentos = []

    (MES_INICIO..MES_FIM).each { mes ->
      def criterio = "exercicio.ano = " + ano +
        " and entidade.id in (" + entidade + ")" +
        " and mes = " + mes

      Dados.contabilidade.v1.movimentacaoBalanceteMensalDespesaExercicio.busca(
        campos: camposMovimento,
        criterio: criterio,
        parametros: [exercicio: ano]
      ).each { item ->
        movimentos << item
      }
    }

    movimentos
  }

  def carregarEmpenhos = { movimentos ->
    def empenhos = [:]
    def ids = movimentos
      .collect { it?.empenho?.id }
      .findAll { it != null && it != 0 }
      .unique()

    ids.collate(500).each { lote ->
      Dados.contabilidade.v1.empenhos.busca(
        campos: camposEmpenho,
        criterio: "id in (" + lote.join(',') + ")"
      ).each { empenho ->
        empenhos[empenho.id] = empenho
      }
    }

    empenhos
  }

  def resultados = exercicios.collect { ano ->
    imprimir "[GERADOR] Consultando exercício " + ano + "..."

    def configuracoes = utilitarios.configuracoesCloud(ano)
    def configuracao = { nome ->
      def encontrada = configuracoes.find { it.configuracao == nome }
      if (encontrada == null) {
        suspender("[ERRO] Não existe configuração '" + nome +
          "' para o exercício " + ano + ".")
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

    def despesas = carregarDespesas(ano)
    def grupos = [:]

    entidadesFiltro.each { entidadeId ->
      def movimentos = buscarMovimentosAno(ano, entidadeId)
      def empenhos = carregarEmpenhos(movimentos)

      movimentos.each { item ->
        def despesa = despesas[item?.despesa?.id]
        if (despesa == null) {
          return
        }

        def ehOrcamento = texto(item.tipoRegistro).toUpperCase() == "ORCAMENTO"
        def empenho = empenhos[item?.empenho?.id]
        if (!ehOrcamento) {
          def exercicioEmpenho = empenho?.exercicio?.ano
          if (exercicioEmpenho == null ||
            Integer.valueOf(String.valueOf(exercicioEmpenho)) != ano) {
            return
          }
        }

        def natureza = ehOrcamento
          ? despesa.natureza
          : empenho?.natureza ?: despesa.natureza
        if (!natureza?.numero || !natureza?.descricao) {
          return
        }

        def recurso = ehOrcamento
          ? item.recurso
          : empenho?.recursoVinculoDetalhamento?.recurso ?:
            empenho?.recursoVinculo?.recurso ?:
            item.recurso
        def organograma = organogramaNivel2(despesa.organograma)
        def funcao = despesa.funcao ?: [:]
        def chave = [
          entidadeId: item.entidade?.id ?: entidadeId,
          entidadeNome: texto(item.entidade?.nome),
          organograma: formatar(mascaraOrganograma, organograma.numero),
          descricaoOrganograma: texto(organograma.descricao),
          funcao: texto(funcao.numero),
          descricaoFuncao: texto(funcao.descricao),
          recurso: formatar(mascaraRecurso, recurso?.numero),
          descricaoRecurso: texto(recurso?.descricao),
          natureza: formatar(mascaraNatureza, natureza.numero),
          descricao: texto(natureza.descricao)
        ]

        def grupo = grupos[chave]
        if (grupo == null) {
          grupo = [chave: chave, meses: mesesZerados()]
          grupos[chave] = grupo
        }

        def chaveMes = String.valueOf(item.mes)
        grupo.meses[chaveMes] =
          (grupo.meses[chaveMes] ?: 0.0) + (item.valorPago ?: 0.0)
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
      (MES_INICIO..MES_FIM).any { mes -> registro["valorPago" + mes] != 0.0 }
    }.sort { left, right ->
      def a = left.organograma + "|" + left.funcao + "|" +
        left.recurso + "|" + left.natureza
      def b = right.organograma + "|" + right.funcao + "|" +
        right.recurso + "|" + right.natureza
      a <=> b
    }

    imprimir "[GERADOR " + VERSAO_GERADOR + "] " + ano + ": " +
      registros.size() + " registros; total " +
      (registros.sum { it.totalMeses } ?: 0.0) + "."

    [
      exercicio: ano,
      totalRegistros: registros.size(),
      relatorio: [
        nome: "Balancete da despesa",
        exercicio: ano,
        periodo: [tipo: "NO", mesInicio: MES_INICIO, mesFim: MES_FIM],
        colunas: [codigo: "PAGO", descricao: "Detalhamento mensal pago"],
        demonstrarDespesas: "O",
        visao: "O_N2",
        siaficIdentificacao: siaficIdentificacao,
        geradorVersao: VERSAO_GERADOR
      ],
      registros: registros
    ]
  }

  def dadosJson = [
    entidadeId: entidadeContexto ?: entidadesFiltro[0],
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
  imprimir "[GERADOR " + VERSAO_GERADOR + "] Finalizado: " +
    dadosJson.totalGeralRegistros + " registros em " +
    exercicios.size() + " exercícios."
  imprimir "[GERADOR] Protocolo: " + protocolo

  retornar protocolo
