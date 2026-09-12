# Guardrail de interface

Ao criar ou alterar telas, siga o padrão visual e estrutural Betha adaptado à identidade Theorema.

- Use `Open Sans` via `var(--font-ui)` para a interface e os tokens existentes para cores, espaçamento e foco.
- Use a hierarquia Betha de botões: uma ação primária por contexto, estados hover/focus visíveis e dimensões consistentes.
- Dropdowns devem seguir a estrutura `dropdown` + `dropdown-toggle` + `dropdown-menu` + `dropdown-item`, com `aria-haspopup`, `aria-expanded`, foco acessível e fechamento por `Escape`.
- Não use `<select>` nativo para componentes cujo menu aberto precise seguir o padrão visual; use o dropdown acessível existente.
- Antes de criar um componente, consulte a documentação oficial Betha Design e atualize os testes de comportamento e estilo.
