/*
 * Gerador exclusivo do TheoView.
 *
 * Contrato de entrada:
 *   p_exercicios: dois exercícios, como lista ou texto JSON.
 *
 * Contrato de saída:
 *   balancete-receita.json
 *   visualizacao.json
 *   protocolo da execução
 *
 * Este script é especializado no relatório mensal orçamentário usado pelo
 * TheoView. Não é uma fonte dinâmica e não retorna Dados.dinamico.
 */

def utilitarios = Scripts.utilitarios_contabil_cloud.importar()
def siaficIdentificacao = utilitarios.siaficIdentificacao()
def entidadeContexto = contextoExecucao.idEntidade
def protocolo = Execucao.atual.protocolo

// Visão: objeto simples com closures para registrar relatórios e empacotá-los.
def visao = [
    relatorios: [],
    fonteExiste: { String fonte ->
        def prefixo = "theo_view."
        if (!fonte?.startsWith(prefixo) || fonte.size() == prefixo.size()) return false
        try {
            return Scripts."fonte.${fonte}".existe() as boolean
        } catch (Exception ignored) {
            return false
        }
    },
    adicionarRelatorio: { Map relatorio ->
        if (!relatorio.id || !relatorio.version || !relatorio.nome || !relatorio.arquivo) {
            throw new IllegalArgumentException("Relatório da visão exige id, version, nome e arquivo.")
        }
        visao.relatorios << [id: relatorio.id, version: relatorio.version, arquivo: relatorio.nome, objeto: relatorio.arquivo]
        relatorio.arquivo
    },
    empacotar: {
        if (!visao.relatorios) throw new IllegalStateException("A visão deve possuir pelo menos um relatório.")
        def manifesto = Arquivo.novo("visualizacao.json", "json")
        manifesto.escreverObjeto([schemaVersion: "1.0.0", visao: [id: "visao-contabil", nome: "Visão Contábil", relatorios: visao.relatorios.collect { [id: it.id, version: it.version, arquivo: it.arquivo] }]])
        Resultado.arquivo(manifesto, "visualizacao.json")
        visao.relatorios.each { item -> Resultado.arquivo(item.objeto, item.arquivo) }
    }
]

if (entidadeContexto == null) {
    suspender("[ERRO] O contexto não informou a entidade.")
}

def valorExercicios = parametros.p_exercicios?.selecionados?.valor ?: []

if (valorExercicios instanceof String) {
    valorExercicios = valorExercicios
        .replaceAll(/[\[\]"]/, "")
        .split(",")
        .collect { it.trim() }
        .findAll { it }
}

def exercicios = valorExercicios instanceof Collection
    ? valorExercicios.toList()
    : [valorExercicios]

exercicios = exercicios
    .collect { Integer.valueOf("${it}") }
    .unique()
    .sort()

if (exercicios.size() != 2) {
    suspender("[ERRO] Informe exatamente dois exercícios diferentes.")
}

// Valores fixos deste gerador especializado.
final def MES_INICIO = 1
final def MES_FIM = 12
final def COLUNAS = "M"
final def DEMONSTRAR_DEDUCOES = "N"
final def NIVEL_NATUREZA = 5
// O relatório legado era composto por Prefeitura e SAMAE. Estes IDs foram
// conferidos diretamente no JSON do protocolo legado.
final def ENTIDADES_RELATORIO = [819, 7317]
final def VERSAO_GERADOR = "2026-09-11-04"

def mesesZerados = {
    (1..12).collectEntries { [(it.toString()): 0.0] }
}

    // Mantém a mesma projeção da fonte original. Mesmo exibindo até o nível 5,
    // a consulta completa evita perder folhas quando a hierarquia cadastral
    // tem níveis posteriores.
    def camposNatureza = (1..10)
        .collect { "naturezaNivel${it}(numero, descricao, tipo)" }
        .join(", ")

def resultados = exercicios.collect { exercicio ->
    imprimir "[GERADOR] Consultando exercício ${exercicio}..."

    def configuracoes = utilitarios.configuracoesCloud(exercicio)
    def configNatureza = configuracoes.find {
        it.configuracao == "NATUREZA_RECEITA"
    }
    def configRecurso = configuracoes.find {
        it.configuracao == "RECURSO"
    }

    def mascaraNatureza = utilitarios.formatacaoMascara(configNatureza)
    def mascaraRecurso = utilitarios.formatacaoMascara(configRecurso)

    def entidadeFiltro = ENTIDADES_RELATORIO.join(", ")
    def criterio = "exercicio.ano = ${exercicio} " +
        "and mes >= ${MES_INICIO} and mes <= ${MES_FIM} " +
        "and entidade.id in (${entidadeFiltro})"

    def campos = "receita.numero, " +
        "receita.natureza(marcadores, numero, descricao, tipo, nivel, naturezaReceitaPai(numero)), " +
        "valorRealizado, mes, entidade(id, nome), recurso(numero, descricao), " +
        "deducaoExercicio.deducaoReceita(descricao), ${camposNatureza}"

    def grupos = [:]
    def quantidadeMovimentos = 0
    def quantidadeMovimentos00076 = 0

    def chaveNatureza = {
        natureza, nivel, entidade, recurso, descricaoDeducao, marcadores ->
        [
            entidadeId: entidade.id,
            entidadeNome: entidade.nome ?: "",
            numeroNaturezaReceita: natureza.numero,
            descNaturezaReceita: natureza.descricao,
            nivelNaturezaReceita: nivel,
            numeroRecurso: recurso.numero ?: "",
            descRecurso: recurso.descricao ?: "",
            marcadoresReceita: marcadores,
            ehDeducao: descricaoDeducao == "nulo" ? "N" : "S",
            descDeducao: descricaoDeducao
        ]
    }

    def adicionarMovimento = { chave, tipoNatureza, mes, valor ->
        if (!grupos[chave]) {
            grupos[chave] = [
                tipoNatureza: tipoNatureza,
                ehFolha: false,
                meses: mesesZerados()
            ]
        }

        // A natureza analítica prevalece sobre a sintética que possa ter
        // sido criada por um movimento anterior.
        if (tipoNatureza == "A") {
            grupos[chave].tipoNatureza = "A"
        }

        grupos[chave].meses[mes] =
            (grupos[chave].meses[mes] ?: 0.0) + valor
    }

    Dados.contabilidade.v1.movimentacaoBalanceteMensalReceita.busca(
        campos: campos,
        criterio: criterio,
        ordenacao: "receita.natureza.numero asc, deducaoExercicio.id desc, recurso.id asc"
    ).each { item ->
        quantidadeMovimentos++
        if ("${item.recurso?.numero}".startsWith("00076")) {
            quantidadeMovimentos00076++
        }
        def entidade = item.entidade ?: [:]
        def recurso = item.recurso ?: [:]
        def deducao = item.deducaoExercicio?.deducaoReceita
        def descricaoDeducao = deducao?.descricao ?: "nulo"
        def marcadores = item.receita?.natureza?.marcadores ?: "Sem marcador informado"
        def mes = Integer.valueOf("${item.mes}").toString()
        def valorRealizado = item.valorRealizado ?: 0.0
        def naturezaBase = item.receita?.natureza
        def nivelNaturezaBase = naturezaBase?.nivel == null
            ? null
            : Integer.valueOf("${naturezaBase.nivel}")

        // Reproduz a fonte-base: primeiro registra a natureza analítica
        // quando ela pertence ao nível demonstrado.
        if (nivelNaturezaBase == NIVEL_NATUREZA &&
            naturezaBase?.numero && naturezaBase?.descricao) {
            def chave = chaveNatureza(
                naturezaBase,
                NIVEL_NATUREZA,
                entidade,
                recurso,
                descricaoDeducao,
                marcadores
            )
            adicionarMovimento(chave, "A", mes, valorRealizado)
        }

        // Em seguida percorre os níveis sintéticos. Se a mesma chave já for
        // analítica, não soma novamente o movimento — esta era a proteção da
        // fonte original contra duplicidade.
        def chaveFolha = null
        (1..NIVEL_NATUREZA).each { nivel ->
            def natureza = item."naturezaNivel${nivel}"
            if (natureza?.numero && natureza?.descricao) {
                def chave = chaveNatureza(
                    natureza,
                    nivel,
                    entidade,
                    recurso,
                    descricaoDeducao,
                    marcadores
                )

                if (grupos[chave]?.tipoNatureza == "A") {
                    chaveFolha = chave
                } else {
                    adicionarMovimento(chave, "S", mes, valorRealizado)
                    chaveFolha = chave
                }
            }
        }

        if (chaveFolha != null && grupos[chaveFolha]) {
            grupos[chaveFolha].ehFolha = true
        }
    }

    def registros = grupos.collect { chave, acumulado ->
        def meses = acumulado.meses
        def tipoNatureza = (
            acumulado.ehFolha ||
            chave.nivelNaturezaReceita >= NIVEL_NATUREZA
        ) ? "A" : acumulado.tipoNatureza

        tipoNatureza == "A" ? [
            tipoNatureza: "A",
            numeroNaturezaReceita: utilitarios.formatarCampo(
                mascaraNatureza,
                chave.numeroNaturezaReceita
            ),
            descNaturezaReceita: chave.descNaturezaReceita,
            numeroRecurso: utilitarios.formatarCampo(
                mascaraRecurso,
                chave.numeroRecurso
            ),
            entidadeNome: chave.entidadeNome,
            valorRealizado1: meses["1"] ?: 0.0,
            valorRealizado2: meses["2"] ?: 0.0,
            valorRealizado3: meses["3"] ?: 0.0,
            valorRealizado4: meses["4"] ?: 0.0,
            valorRealizado5: meses["5"] ?: 0.0,
            valorRealizado6: meses["6"] ?: 0.0,
            valorRealizado7: meses["7"] ?: 0.0,
            valorRealizado8: meses["8"] ?: 0.0,
            valorRealizado9: meses["9"] ?: 0.0,
            valorRealizado10: meses["10"] ?: 0.0,
            valorRealizado11: meses["11"] ?: 0.0,
            valorRealizado12: meses["12"] ?: 0.0,
            totalMeses: meses.values().sum() ?: 0.0
        ] : null
    }.findAll { registro ->
        registro != null &&
            (1..12).any { mes -> registro["valorRealizado${mes}"] != 0.0 }
    }

    def relatorio = [
        nome: "Balancete da receita",
        exercicio: exercicio,
        periodo: [
            tipo: "NO",
            mesInicio: MES_INICIO,
            mesFim: MES_FIM
        ],
        colunas: [
            codigo: COLUNAS,
            descricao: "Arrecadado mensal (Líquido)"
        ],
        demonstrarDeducoes: DEMONSTRAR_DEDUCOES,
        siaficIdentificacao: siaficIdentificacao,
        geradorVersao: VERSAO_GERADOR
    ]

    def registrosRecurso00076 = registros.findAll {
        "${it.numeroRecurso}".startsWith("00076")
    }.size()

    imprimir "[GERADOR ${VERSAO_GERADOR}] ${exercicio}: ${quantidadeMovimentos} movimentos " +
        "(${quantidadeMovimentos00076} do recurso 00076), " +
        "${registros.size()} registros " +
        "(${registrosRecurso00076} do recurso 00076); " +
        "total ${registros.sum { it.totalMeses } ?: 0.0}."

    [
        exercicio: exercicio,
        totalRegistros: registros.size(),
        relatorio: relatorio,
        registros: registros
    ]
}

def dadosJson = [
    entidadeId: entidadeContexto,
    entidadeIds: ENTIDADES_RELATORIO,
    exercicios: exercicios,
    quantidadeExercicios: exercicios.size(),
    totalGeralRegistros: resultados.sum { it.totalRegistros } ?: 0,
    resultados: resultados
]

def arquivoResultado = Arquivo.novo("balancete-receita.json", "json")
arquivoResultado.escreverObjeto(dadosJson)

visao.adicionarRelatorio(id: "balancete-receita", version: "1.0.0", nome: "balancete-receita.json", arquivo: arquivoResultado)
visao.empacotar()

imprimir "[GERADOR ${VERSAO_GERADOR}] Finalizado: ${dadosJson.totalGeralRegistros} registros " +
    "em ${exercicios.size()} exercícios."
imprimir "[GERADOR] Protocolo: ${protocolo}"

retornar protocolo
