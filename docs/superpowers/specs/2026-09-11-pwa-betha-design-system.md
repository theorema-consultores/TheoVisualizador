# Shell único e alinhamento ao Design System Betha

## Objetivo

Transformar o visualizador em uma experiência de aplicação única, mantendo o endereço na raiz após a abertura do protocolo e tornando os dashboards consistentes com os padrões documentados pela Betha, adaptados à identidade Theorema.

## Referências

- [Princípios de Design Betha](https://docs.plataforma.betha.cloud/docs/design/fundamentos/principios/): simplicidade, controle do usuário, consistência e proatividade adequada.
- [Cores Betha](https://docs.plataforma.betha.cloud/docs/design/fundamentos/cores/): azul para ações principais, cinzas para estrutura e cores semânticas para estados, com contraste AA mínimo.
- [Tipografia Betha](https://docs.plataforma.betha.cloud/docs/design/fundamentos/tipografia/): Open Sans como família de interface.
- [Wizard e abas Betha](https://docs.plataforma.betha.cloud/docs/design/componentes/wizard/): padrão `nav-tabs`, estado ativo claro e orientação horizontal/vertical.
- [Botões Betha](https://docs.plataforma.betha.cloud/docs/design/componentes/botao/): hierarquia de ações e uso de uma ação primária por contexto.
- [Espaçamento Betha](https://docs.plataforma.betha.cloud/docs/design/layout/espacamento/): escala consistente de espaçamento.
- [Helpers Betha](https://docs.plataforma.betha.cloud/docs/design/layout/helpers/): camadas para dropdown, sticky e modal.

## Experiência e fluxo

1. A entrada continua sendo `/?protocolo=UUID`.
2. O shell valida o protocolo, baixa e armazena o ZIP e resolve o manifesto.
3. Após a transferência, a aplicação substitui a URL por `/` usando `history.replaceState`.
4. O shell monta o dashboard resolvido dentro do mesmo documento, sem navegar para uma página física com o nome do relatório.
5. Em atualização da página, a sessão recupera o ZIP e o dashboard ativo. Sem sessão ou protocolo, a tela inicial pede um protocolo.
6. Erros de protocolo inválido, download e manifesto continuam sendo estados explícitos, com ação de recuperação.

## Arquitetura

O registro de dashboards será a fonte única para `id`, `version`, `label`, carregador, renderizador e metadados de estilo. Cada dashboard exportará uma função de montagem, sem executar automaticamente ao ser importado. O `main.js` será o ponto de entrada único e coordenará:

- tema e shell global;
- resolução e persistência da transferência;
- seleção do dashboard;
- montagem/desmontagem da visualização;
- atualização da URL sem recarregar a página.

O runtime continuará recebendo dependências por injeção nos testes, mas deixará de depender de redirecionamento para `/dashboards/<id>/`.

## Navegação de visualizações

O nav global terá logo, seletor de visualizações, tema e suporte. A seleção terá duas apresentações:

- até 4 visualizações: abas horizontais com `role="tablist"`, `role="tab"`, `aria-selected` e foco visível;
- mais de 4: dropdown nativo estilizado, com `label` acessível, camada acima do conteúdo e fechamento natural pelo navegador.

O texto será obtido pelo mapa de labels do registro, como `balancete-receita: B. Receita`. IDs sem label usarão fallback legível. Visualizações repetidas terão sufixo numérico apenas quando necessário.

## Linguagem visual

- Open Sans para textos e títulos de interface.
- Tokens compartilhados para cor, superfície, borda, foco, tipografia e espaçamento.
- Azul Theorema/Betha adaptado para ação primária; marrom Theorema reservado para identidade e destaque.
- Verde, vermelho, amarelo e laranja apenas para estados semânticos.
- Menos sombras, raios moderados, bordas claras e superfícies planas.
- Tabelas, filtros, selects, cards e abas devem consumir os tokens, incluindo o tema escuro.
- Contraste mínimo AA nos estados normais e de foco.

## Compatibilidade e URL

As páginas físicas atuais poderão permanecer no build temporariamente para compatibilidade com links antigos, mas o fluxo novo não navegará para elas. A URL canônica após a abertura será `/`. A sessão será a fonte de recuperação local; o protocolo não será exposto novamente após a resolução.

## Testes e critérios de aceite

- Entrada com protocolo válido monta o dashboard na raiz e remove o protocolo da URL.
- Atualização da raiz recupera o dashboard pela sessão.
- Raiz sem protocolo apresenta campo de protocolo, não erro técnico.
- Manifestos com 1 e N visualizações alternam corretamente.
- Quatro visualizações usam abas; cinco ou mais usam dropdown.
- Labels amigáveis aparecem no controle e IDs desconhecidos têm fallback.
- Dashboard desmontado não deixa listeners ou conteúdo residual.
- Tema claro/escuro funciona no shell e no dashboard.
- Testes existentes e build continuam passando.
