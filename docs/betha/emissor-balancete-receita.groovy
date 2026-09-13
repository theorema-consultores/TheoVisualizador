def protocolo = Scripts
    ."fonte.theo_view.balancete_receita"
    .executar([
        p_exercicios: '["2025", "2026"]'
    ])
    .valor()

def linkTheoView =
    "https://visualizador.theoremaconsultores.com.br/?protocolo=${protocolo}"

Notificacao.nova(
    "O Balancete da Receita está pronto para visualização."
)
.para(contextoExecucao.usuario.id)
.link(
    linkTheoView,
    "Balancete da Receita",
    "Abrir no TheoView",
    "blank"
)
.enviar()

imprimir "Protocolo recebido: ${protocolo}"
imprimir "TheoView: ${linkTheoView}"
