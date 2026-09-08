# Visualizador de relatórios por protocolo

## 1. Objetivo

Reconstruir o projeto como um site estático capaz de abrir uma emissão de relatório a partir de um protocolo, baixar o ZIP correspondente, identificar o dashboard indicado pelos metadados do arquivo e apresentar uma visualização externa e isolada.

Cada emissão representa um relatório independente. O produto não terá catálogo, histórico, menu ou navegação entre relatórios. A aplicação será aberta por uma ferramenta externa e deverá conduzir o usuário diretamente à visualização correta.

O primeiro dashboard implementado será `balancete-receita@1.0.0`. Ele substituirá a implementação atual e servirá como referência estrutural para dashboards futuros.

## 2. Escopo

### 2.1 Incluído

- Abertura exclusiva por protocolo informado na URL.
- Download público e direto do ZIP pelo navegador.
- Identificação do dashboard por um arquivo de metadados dentro do ZIP.
- Validação das versões do metadado e do dashboard.
- Redirecionamento para uma página física específica de cada dashboard.
- Transferência temporária do ZIP entre páginas por IndexedDB.
- Recuperação após atualização da página usando o protocolo mantido na sessão da aba.
- Shell visual mínimo compartilhado.
- Dashboard de Balancete da Receita na versão `1.0.0`.
- Build multipágina e publicação no GitHub Pages.
- Testes do núcleo e testes contratuais de cada dashboard.

### 2.2 Fora do escopo

- Entrada manual de protocolo.
- Upload manual de ZIP.
- Login ou controle de acesso no visualizador.
- Backend, proxy, banco de dados ou persistência de relatórios.
- Catálogo ou descoberta de dashboards pelo usuário.
- Navegação entre relatórios.
- Histórico de emissões.
- Compartilhamento criado pelo visualizador.
- Execução de código fornecido pelo ZIP.
- Compatibilidade com a estrutura interna do dashboard HTML atual.

## 3. Restrições

- O repositório e o site serão públicos.
- A aplicação será totalmente estática.
- A publicação ocorrerá no GitHub Pages, inclusive sob o subcaminho de um repositório.
- Nenhum segredo, token ou credencial poderá fazer parte do código ou do build.
- O processamento do ZIP e dos JSONs ocorrerá exclusivamente no navegador.
- O protocolo será removido da URL por apresentação visual, não como mecanismo de segurança.
- O download deverá funcionar sem autenticação e sem cookies.

## 4. Arquitetura

O projeto será uma aplicação multipágina construída com Vite, JavaScript moderno, ES Modules, HTML e CSS nativos. Não serão adotados framework de interface, TypeScript, backend ou banco de dados na primeira versão.

Existirão dois tipos de página:

1. **Resolvedora:** recebe o protocolo, baixa o ZIP, lê os metadados e seleciona o dashboard.
2. **Dashboard:** página física independente que recupera o ZIP e processa seu próprio contrato de dados.

Estrutura de referência:

```text
src/
├── core/
│   ├── protocol.js
│   ├── download.js
│   ├── archive.js
│   ├── metadata.js
│   ├── dashboard-registry.js
│   ├── transfer-store.js
│   └── dashboard-runtime.js
├── dashboards/
│   └── balancete-receita/
│       ├── index.html
│       ├── index.js
│       ├── data.js
│       ├── view.js
│       └── styles.css
├── shared/
│   ├── errors.js
│   ├── formatting.js
│   └── shell.css
├── index.html
├── main.js
└── styles.css
```

O build deverá gerar pelo menos:

```text
dist/
├── index.html
└── dashboards/
    └── balancete-receita/
        └── index.html
```

## 5. Fluxo principal

1. A ferramenta externa abre `/?protocolo=UUID`.
2. A página resolvedora valida o formato do protocolo.
3. O protocolo é salvo no `sessionStorage` da aba.
4. A aplicação baixa o ZIP pelo endpoint público `https://plataforma-execucoes.betha.cloud/v1/download/api/execucoes/{protocolo}/resultado`, sem cookies ou credenciais.
5. O núcleo localiza e valida `/visualizacao.json`.
6. O registro interno resolve o par `dashboard.id` e `dashboard.version`.
7. O ZIP é armazenado temporariamente no IndexedDB sob um identificador aleatório.
8. O identificador da transferência é salvo no `sessionStorage`.
9. A aplicação usa `location.replace()` para abrir a página física registrada.
10. A URL final não contém o protocolo nem o identificador da transferência.
11. O runtime do dashboard recupera o ZIP do IndexedDB e o mantém em memória.
12. A cópia temporária é removida do IndexedDB.
13. O runtime confirma que os metadados correspondem à página atual.
14. O dashboard localiza, valida e transforma seus próprios dados.
15. O dashboard renderiza o relatório dentro do shell compartilhado.

Não haverá página inicial funcional para navegação. Sem um protocolo válido ou uma transferência em andamento, a aplicação exibirá um estado de erro apropriado.

## 6. Atualização e recuperação

O `sessionStorage` é isolado por aba e guardará o protocolo da emissão corrente. Depois do redirecionamento, uma atualização da página seguirá este fluxo:

1. O runtime não encontra uma transferência pendente no IndexedDB.
2. Recupera o protocolo do `sessionStorage`.
3. Baixa novamente o ZIP.
4. Valida os metadados.
5. Se o dashboard indicado continuar sendo o atual, processa o ZIP localmente.
6. Se o dashboard ou sua página tiver mudado, cria uma nova transferência e redireciona para a página registrada correta.

Um novo protocolo aberto na mesma aba substitui a emissão anterior. Abas diferentes mantêm sessões independentes.

Registros temporários abandonados no IndexedDB receberão data de criação e serão eliminados na inicialização seguinte quando tiverem mais de uma hora. A limpeza não depende exclusivamente de eventos de fechamento da página.

## 7. Contrato de metadados

Todo ZIP deverá conter exatamente um arquivo `visualizacao.json` na raiz, com nome em letras minúsculas, conteúdo JSON válido e codificação UTF-8.

Versão inicial:

```json
{
  "schemaVersion": "1.0.0",
  "dashboard": {
    "id": "balancete-receita",
    "version": "1.0.0"
  }
}
```

### 7.1 Campos

- `schemaVersion`: versão semântica do contrato de `visualizacao.json`.
- `dashboard.id`: identificador estável do dashboard no registro interno.
- `dashboard.version`: versão semântica do contrato de dados esperado pelo dashboard.

Todos os campos são obrigatórios e não são permitidos valores vazios. As versões devem seguir `MAJOR.MINOR.PATCH`.

Na primeira fase, a compatibilidade será exata: o núcleo somente abrirá um dashboard quando o registro contiver exatamente o `id` e a `version` solicitados. Migrações ou adaptadores para versões anteriores serão adicionados apenas quando houver necessidade real.

O metadado não indicará arquivos de dados, títulos, entidade, aparência, caminhos de página ou scripts. Cada dashboard será integralmente responsável por seus arquivos.

## 8. Registro de dashboards

O registro será mantido no código público e associará identidades conhecidas a páginas físicas conhecidas:

```js
{
  id: "balancete-receita",
  version: "1.0.0",
  page: "dashboards/balancete-receita/"
}
```

O ZIP nunca poderá fornecer ou alterar o caminho de uma página. Um par não registrado produzirá erro de dashboard ausente ou versão incompatível.

Adicionar um dashboard exigirá:

1. Criar sua página física.
2. Implementar a interface padrão do runtime.
3. Registrar seu identificador e versão.
4. Criar fixtures fictícias.
5. Criar testes contratuais e de interface.
6. Incluir a página no build multipágina.

## 9. Interface dos dashboards

Cada página registrará sua identidade e fornecerá duas operações conceituais:

```js
startDashboard({
  id: "balancete-receita",
  version: "1.0.0",
  load,
  render
});
```

### 9.1 `load(archive)`

- Recebe uma abstração somente leitura do ZIP.
- Localiza os arquivos necessários.
- Valida o contrato específico do relatório.
- Converte os dados em um modelo de visualização.
- Retorna dados prontos para apresentação.
- Produz erros específicos e compreensíveis.

### 9.2 `render(container, model)`

- Recebe apenas o modelo validado.
- Renderiza dentro da área principal fornecida pelo shell.
- Controla filtros, agrupamentos, ordenação e interações locais.
- Não acessa protocolo, endpoint Betha ou IndexedDB.

Um dashboard não poderá importar módulos internos de outro. Código realmente reutilizável deverá ser promovido para `shared` com uma interface estável.

## 10. Shell visual compartilhado

O shell será mínimo e obrigatório. Ele fornecerá:

- Área de identidade, título e informações gerais do relatório.
- Estado de carregamento.
- Estado de erro.
- Área principal livre para o dashboard.
- Largura, espaçamento e tipografia básicos.
- Cores básicas de fundo e estados.
- Botão `Tentar novamente` quando houver protocolo na sessão.
- Responsividade mínima.
- Foco visível e região acessível para mensagens de estado.

Cards, gráficos, filtros, tabelas, abas, cores analíticas e demais decisões internas pertencem ao dashboard.

O CSS específico deverá ser limitado ao elemento raiz do dashboard e não poderá alterar o funcionamento do shell.

## 11. Erros

O núcleo deverá distinguir as seguintes falhas:

- Protocolo ausente.
- Formato de protocolo inválido.
- Tempo limite de download.
- Resposta HTTP não disponível.
- Limite de tamanho excedido.
- ZIP inválido ou protegido por senha.
- `visualizacao.json` ausente, duplicado ou inválido.
- Versão do metadado incompatível.
- Dashboard não registrado.
- Versão do dashboard não suportada.
- Falha de armazenamento ou recuperação no IndexedDB.
- Metadado incompatível com a página física atual.
- Falha no processamento específico do dashboard.
- Falha inesperada de renderização.

A interface apresentará título simples, explicação compreensível, código técnico curto e ação possível. Pilhas e detalhes internos ficarão restritos ao console de desenvolvimento.

Uma falha do dashboard não poderá resultar em página vazia.

## 12. Limites operacionais

Os limites iniciais serão centralizados no núcleo:

- ZIP de até 25 MB.
- Até 500 arquivos JSON.
- Até 10 MB combinados de JSON descompactado.
- Download com tempo máximo de 30 segundos.
- Uma emissão ativa por aba.

Os dashboards poderão impor limites menores aos seus próprios dados, mas não alterar os limites globais.

## 13. Segurança e privacidade

O produto não utilizará controles densos de segurança, mas deverá manter estas garantias básicas:

- Dados do relatório não serão enviados a outros serviços.
- ZIP e JSON não serão adicionados ao repositório nem ao build.
- Conteúdo proveniente dos JSONs será inserido como texto ou sanitizado.
- Dados fornecidos pelo ZIP não serão executados como HTML ou JavaScript.
- O ZIP não escolherá módulos, páginas ou URLs arbitrários.
- Nenhuma credencial será armazenada no código.
- O download não enviará cookies.
- A transferência no IndexedDB será temporária.

O protocolo não será considerado secreto. Sua remoção da URL tem finalidade exclusivamente estética e não garante remoção de histórico, registros da ferramenta emissora ou registros de rede.

## 14. Dashboard Balancete da Receita 1.0.0

### 14.1 Arquivo de dados

O dashboard localizará exatamente um arquivo cujo nome base seja `balancete-receita.json`, sem diferenciar maiúsculas e minúsculas e independentemente da subpasta em que esteja.

Ausência ou duplicidade será tratada como erro específico do relatório.

### 14.2 Contrato esperado

O JSON deverá possuir uma coleção `resultados` com exatamente dois exercícios válidos. Cada resultado deverá conter:

- `exercicio`: ano inteiro.
- `registros`: coleção de registros analíticos.

Os registros utilizados deverão conter:

- `tipoNatureza`.
- `numeroNaturezaReceita`.
- `descNaturezaReceita`.
- `numeroReceita`.
- `numeroRecurso`.
- `valorRealizado1` até `valorRealizado12`.
- `totalMeses`.
- `entidadeNome`.

Somente registros cujo `tipoNatureza` seja exatamente `A` participarão dos cálculos. Valores monetários deverão ser números JSON finitos. Campos obrigatórios inválidos não serão convertidos silenciosamente em zero.

Os exercícios serão ordenados numericamente: o menor será o anterior e o maior será o atual.

### 14.3 Indicadores

O cabeçalho exibirá a entidade e os exercícios comparados. Os indicadores serão:

- Total do exercício atual.
- Total do exercício anterior.
- Variação absoluta anual.
- Variação percentual anual.
- Total do mês selecionado no exercício atual.
- Total do mesmo mês no exercício anterior.

O seletor terá os doze meses e começará no mês corrente do navegador.

A soma de `totalMeses` dos registros será a fonte dos totais anuais. Os campos `valorRealizado1` a `valorRealizado12` serão a fonte dos totais mensais.

A variação absoluta será `atual - anterior`. A variação percentual será `(atual - anterior) / abs(anterior) * 100`. Quando o valor anterior for zero, a porcentagem será exibida como não calculável, em vez de apresentar um percentual artificial.

### 14.4 Visões analíticas

O dashboard terá seis visões:

1. Receita e descrição.
2. Recurso.
3. Origem do recurso.
4. Aplicação da fonte.
5. Desdobramento da fonte.
6. Detalhamento da fonte.

Cada visão terá:

- Ranking dos oito maiores grupos do exercício atual.
- Filtro por código ou descrição.
- Tabela comparativa.
- Ordenação por coluna.
- Total dos dois exercícios.
- Variação absoluta.
- Variação percentual.
- Detalhamento dos doze meses.
- Quantidade de registros por exercício.
- Participação no total do exercício atual.

### 14.5 Máscara de recurso

O código de recurso será decomposto nos componentes de origem, aplicação, desdobramento e detalhamento. Os glossários serão dados versionados do próprio dashboard e não ficarão misturados à lógica de renderização.

Códigos desconhecidos receberão uma descrição genérica e continuarão visíveis. A ausência de uma descrição no glossário não descartará valores financeiros.

## 15. Testes

### 15.1 Núcleo

- Validação e normalização do protocolo.
- Construção do endpoint de download.
- Respostas HTTP e tempo limite.
- Limites durante o recebimento.
- ZIP válido, inválido e protegido.
- Localização exata do metadado na raiz.
- Metadado ausente, duplicado e malformado.
- Validação de versões semânticas.
- Resolução de dashboard e versão.
- Escrita, leitura e limpeza de transferências.
- Recuperação por protocolo após atualização.
- Redirecionamento para a página correta.
- Estados visuais de carregamento e erro.

### 15.2 Balancete da Receita

- Localização do arquivo em raiz e subpastas.
- Arquivo ausente e duplicado.
- Quantidade inválida de exercícios.
- Campos ausentes e valores monetários inválidos.
- Filtro por `tipoNatureza`.
- Ordenação dos exercícios.
- Agregações anuais e mensais.
- Variações com valores positivos, negativos e base zero.
- Decomposição da máscara de recurso.
- Filtro, ordenação e detalhamento das tabelas.
- Renderização segura de conteúdo semelhante a HTML.

Fixtures serão pequenas, fictícias e versionadas. O comando padrão de testes deverá falhar quando nenhum teste for encontrado.

## 16. Publicação

A publicação ocorrerá por GitHub Actions:

1. Push na branch principal.
2. Instalação reproduzível das dependências.
3. Lint.
4. Testes.
5. Build multipágina do Vite.
6. Publicação da pasta `dist` no GitHub Pages.

O caminho-base será configurável para não depender do nome definitivo do repositório. A aplicação não dependerá de reescrita de rotas ou de uma página `404.html`.

## 17. Critérios de aceite da base

A base estará pronta quando:

1. Uma URL válida com protocolo baixar um ZIP público.
2. O protocolo desaparecer da URL durante a transição para o dashboard.
3. Um `visualizacao.json` válido selecionar a página física correta.
4. Dashboard e versão incompatíveis produzirem erro compreensível.
5. O ZIP atravessar a navegação sem novo download.
6. A cópia temporária for removida após a recuperação.
7. Atualizar a página final refizer o download usando a sessão da aba.
8. O dashboard receber uma abstração do ZIP sem acessar infraestrutura interna.
9. O Balancete da Receita reproduzir as visões e cálculos definidos nesta spec.
10. Conteúdo de dados não for executado como HTML.
11. Testes, lint e build passarem antes da publicação.
12. O resultado publicado funcionar no subcaminho do GitHub Pages.

## 18. Evolução de dashboards

Cada dashboard futuro deverá possuir identidade e versão próprias, página física, contrato de dados, modelo de visualização, estilos isolados, fixtures e testes.

Uma alteração incompatível no contrato de dados incrementará a versão principal do dashboard e exigirá uma nova entrada no registro. Alterações compatíveis poderão incrementar versões menor ou de correção, mas a primeira fase continuará exigindo correspondência exata até que uma política explícita de compatibilidade seja criada.
