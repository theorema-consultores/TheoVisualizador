try {
    def utilitarios = Scripts.utilitarios_contabil_cloud.importar()
    def siaficIdentificacao = utilitarios.siaficIdentificacao()
    def entidadeId = contextoExecucao.idEntidade
    def protocolo = Execucao.atual.protocolo
    def geradorVersao = "2026-09-14-01"

    if (entidadeId == null) {
        suspender("[ERRO] O contexto não informou a entidade.")
    }

    // A visão empacota o manifesto e o JSON, como no Balancete da Receita.
    def visao = [
        relatorios: [],
        temasSemLicenca: [],
        adicionarRelatorio: { Map relatorio ->
            if (!relatorio.id || !relatorio.version || !relatorio.nome || !relatorio.arquivo) {
                throw new IllegalArgumentException("Relatório da visão exige id, version, nome e arquivo.")
            }
            visao.relatorios << [
                id: relatorio.id,
                version: relatorio.version,
                arquivo: relatorio.nome,
                objeto: relatorio.arquivo
            ]
        },
        empacotar: {
            if (!visao.relatorios) {
                throw new IllegalStateException("A visão deve possuir pelo menos um relatório.")
            }
            def manifesto = Arquivo.novo("visualizacao.json", "json")
            manifesto.escreverObjeto([
                schemaVersion: "1.0.0",
                visao: [
                    id: "visao-contabil",
                    nome: "Visão Contábil",
                    temasSemLicenca: visao.temasSemLicenca,
                    relatorios: visao.relatorios.collect {
                        [id: it.id, version: it.version, arquivo: it.arquivo]
                    }
                ]
            ])
            Resultado.arquivo(manifesto, "visualizacao.json")
            visao.relatorios.each { item -> Resultado.arquivo(item.objeto, item.arquivo) }
        }
    ]

    def valorExercicios = parametros.p_exercicios?.selecionados?.valor ?: []
    if (valorExercicios instanceof String) {
        valorExercicios = valorExercicios
            .replaceAll(/[\[\]"]/, "")
            .split(",")
            .collect { it.trim() }
            .findAll { it }
    }

    def exercicios = (valorExercicios instanceof Collection
        ? valorExercicios.toList()
        : [valorExercicios])
        .collect { Integer.valueOf("${it}") }
        .unique()
        .sort()

    if (exercicios.size() != 2) {
        suspender("[ERRO] Informe exatamente dois exercícios diferentes.")
    }

    def texto = { value -> value == null ? "" : "${value}".trim() }
    def registroRecurso = { item ->
        if (texto(item.tipoRegistro).toUpperCase() == "ORCAMENTO") {
            return item.recurso ?: [:]
        }
        return item.empenho?.recursoVinculoDetalhamento?.recurso ?:
            item.empenho?.recursoVinculo?.recurso ?:
            item.recurso ?: [:]
    }
    def organogramaNivel2 = { organograma ->
        def atual = organograma ?: [:]
        while (atual?.nivel != null && Integer.valueOf("${atual.nivel}") > 2 && atual.organogramaPai) {
            atual = atual.organogramaPai
        }
        atual
    }

    def resultados = exercicios.collect { exercicio ->
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
        def grupos = [:]
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
            def entidade = item.entidade ?: [:]
            def despesa = item.despesa ?: [:]
            def natureza = despesa.natureza ?: item.empenho?.natureza ?: [:]
            def funcao = despesa.funcao ?: [:]
            def organograma = organogramaNivel2(despesa.organograma)
            def recurso = registroRecurso(item)
            def chave = [
                entidadeId: entidade.id ?: entidadeId,
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
            def grupo = grupos[chave]
            if (grupo == null) {
                grupo = [chave: chave, meses: (1..12).collect { 0.0 }]
                grupos[chave] = grupo
            }
            def mes = Integer.valueOf("${item.mes}")
            if (mes >= 1 && mes <= 12) {
                grupo.meses[mes - 1] += item.valorPago ?: 0.0
            }
        }

        def registros = grupos.values().collect { grupo ->
            def registro = [
                entidadeId: grupo.chave.entidadeId,
                entidadeNome: grupo.chave.entidadeNome,
                organograma: grupo.chave.organograma,
                descricaoOrganograma: grupo.chave.descricaoOrganograma,
                funcao: grupo.chave.funcao,
                descricaoFuncao: grupo.chave.descricaoFuncao,
                recurso: grupo.chave.recurso,
                descricaoRecurso: grupo.chave.descricaoRecurso,
                natureza: grupo.chave.natureza,
                descricao: grupo.chave.descricao,
                meses: grupo.meses,
                total: grupo.meses.sum() ?: 0.0
            ]
            registro
        }.findAll { registro -> registro.meses.any { it != 0.0 } }
            .sort { left, right ->
                def a = "${left.organograma}|${left.natureza}|${left.descricao}|${left.recurso}"
                def b = "${right.organograma}|${right.natureza}|${right.descricao}|${right.recurso}"
                a <=> b
            }

        [
            exercicio: exercicio,
            totalRegistros: registros.size(),
            relatorio: [
                nome: "Balancete da despesa",
                exercicio: exercicio,
                periodo: [tipo: "NO", mesInicio: 1, mesFim: 12],
                colunas: [codigo: "PAGO", descricao: "Detalhamento mensal pago"],
                demonstrarDespesas: "O",
                visao: "O_N2",
                siaficIdentificacao: siaficIdentificacao,
                geradorVersao: geradorVersao
            ],
            registros: registros
        ]
    }

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

    imprimir "[GERADOR ${geradorVersao}] Finalizado: ${dadosJson.totalGeralRegistros} registros em ${exercicios.size()} exercícios."
    imprimir "[GERADOR] Protocolo: ${protocolo}"
    retornar protocolo
} catch (Exception error) {
    def notificacoesUtil = importar "bth.contabil.utilitarios.notifica.execucao"
    notificacoesUtil.setMsgError(tipo: "BALANCETE-DESP", isMsgApp: true)
    suspender("${error.toString()}")
}
