# Shell único e alinhamento Betha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Montar todos os relatórios dentro da raiz `/`, com URL canônica sem o nome do dashboard, e alinhar navegação, abas/dropdown e tokens visuais aos padrões Betha adaptados à Theorema.

**Architecture:** `src/main.js` será o único ponto de entrada. O registro de dashboards passará a fornecer funções de montagem; o runtime resolverá o ZIP, armazenará a sessão e montará/desmontará o dashboard sem `window.location.replace` para páginas físicas. O nav global escolherá abas horizontais para até quatro itens e um `select` nativo para cinco ou mais.

**Tech Stack:** JavaScript ES modules, Vite, DOM nativo, CSS custom properties, Node test runner e JSDOM.

**Spec:** `docs/superpowers/specs/2026-09-11-pwa-betha-design-system.md`

## Global Constraints

- Manter o protocolo apenas na URL de entrada; após resolver, usar `history.replaceState` para `/`.
- Usar Open Sans como fonte de interface e escala consistente de espaçamento.
- Usar azul para ações, cinzas para estrutura e cores semânticas para estados.
- Manter tema claro/escuro, suporte, logo, favicon e labels amigáveis.
- Não adicionar dependências; usar DOM nativo e `<select>` para dropdown.
- Preservar páginas físicas no build apenas como compatibilidade, sem usá-las no fluxo novo.

---

### Task 1: Registro montável de dashboards

**Files:**
- Modify: `src/core/dashboard-registry.js`
- Modify: `src/dashboards/balancete-receita/index.js`
- Create: `tests/core/dashboard-registry.test.js`

**Interfaces:**
- Produces `registerDashboard({ id, version, label, mount })` data consumed by the runtime.
- `mount(container, context)` returns `{ destroy() }` and never executes during module import.

- [ ] **Step 1: Write failing tests for a registry entry and mount contract**

```js
test('resolves a dashboard with a label and mount function', () => {
  const dashboard = resolveDashboard(metadata);
  assert.equal(dashboard.label, 'B. Receita');
  assert.equal(typeof dashboard.mount, 'function');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/core/dashboard-registry.test.js`
Expected: FAIL because the registry currently returns only the physical page.

- [ ] **Step 3: Export a non-starting Balancete mount**

Move the current auto-start code from `src/dashboards/balancete-receita/index.js` into:

```js
export function mountBalancete(container, context) {
  return renderBalancete(container, context.model);
}
```

Keep the legacy physical page as a thin compatibility entry only if the build still needs it.

- [ ] **Step 4: Add `mount` to the registry and pass the label**

The entry must include `{ id: 'balancete-receita', label: 'B. Receita', version: '1.0.0', page: 'dashboards/balancete-receita/', mount: mountBalancete }`.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: existing dashboard rendering tests pass and the new registry test passes.

- [ ] **Step 6: Commit**

```bash
git add src/core/dashboard-registry.js src/dashboards/balancete-receita/index.js tests/core/dashboard-registry.test.js
git commit -m "refactor: expose dashboards as mountable modules"
```

### Task 2: Root shell and URL state

**Files:**
- Modify: `src/core/resolver.js`
- Modify: `src/core/dashboard-runtime.js`
- Modify: `src/main.js`
- Modify: `tests/core/resolver.test.js`
- Modify: `tests/core/dashboard-runtime.test.js`

**Interfaces:**
- `resolveReport` stores the transfer and returns `{ dashboard, metadata, bytes }` without navigating.
- `startDashboard({ dashboard, bytes, index, ... })` mounts one selected visualization and returns a destroy handle.

- [ ] **Step 1: Add failing tests for root navigation**

```js
test('resolves a report without navigating to a dashboard path', async () => {
  let target;
  await resolveReport({ ...dependencies, navigate: value => { target = value; } });
  assert.equal(target, '/');
});
```

Add a dashboard-runtime test that calls `destroy()` and asserts the dashboard container is empty.

- [ ] **Step 2: Run focused tests and verify the expected failures**

Run: `node --test tests/core/resolver.test.js tests/core/dashboard-runtime.test.js`
Expected: FAIL because the resolver currently navigates to `dashboard.page` and the runtime returns only the render result.

- [ ] **Step 3: Change the resolver to replace the URL and return state**

After storing the transfer, call `navigate('/')` and return the resolved dashboard plus metadata and transfer id. Do not put the protocol back into the target URL.

- [ ] **Step 4: Make the runtime mountable**

Load the selected archive entry, call the dashboard loader with `{ protocol, visualizationIndex, visualizationCount }`, render into the container, and return `destroy()` that invokes the dashboard renderer’s destroy handle when present and clears the container.

- [ ] **Step 5: Make `main.js` recover session state**

Use the query protocol when present. When absent, use `report.transferId` and `report.protocol` from session; show the protocol prompt only when both are absent. Use `history.replaceState({}, '', '/')` after resolution.

- [ ] **Step 6: Run the full suite and build**

Run: `npm test; npm run build`
Expected: all tests pass and both root and compatibility pages build.

- [ ] **Step 7: Commit**

```bash
git add src/core/resolver.js src/core/dashboard-runtime.js src/main.js tests/core/resolver.test.js tests/core/dashboard-runtime.test.js
git commit -m "feat: mount reports from a single root shell"
```

### Task 3: Shared navigation with tabs and dropdown

**Files:**
- Create: `src/shared/report-navigation.js`
- Create: `tests/shared/report-navigation.test.js`
- Modify: `src/main.js`
- Modify: `src/styles.css`

**Interfaces:**
- `renderReportNavigation(container, { visualizations, activeIndex, onSelect, onThemeToggle })` returns `{ destroy() }`.
- Up to 4 items render as `role="tablist"`; 5 or more render as a labeled native `select`.

- [ ] **Step 1: Write failing tests for both navigation modes**

```js
test('renders tabs for four visualizations and select for five', () => {
  const tabs = renderReportNavigation(container, { visualizations: four, activeIndex: 0, onSelect() {} });
  assert.equal(container.querySelector('[role="tablist"]') !== null, true);
  tabs.destroy();
  renderReportNavigation(container, { visualizations: five, activeIndex: 0, onSelect() {} });
  assert.equal(container.querySelector('select[name="visualizacao"]') !== null, true);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/shared/report-navigation.test.js`
Expected: FAIL because navigation is currently built inline in the Balancete page.

- [ ] **Step 3: Implement the native controls**

Use label values from the registry, suffix repeated labels only when needed, set `aria-selected`, and emit zero-based selected indices through `onSelect`.

- [ ] **Step 4: Move logo, support and theme controls into the shared navigation**

Reuse the existing logo asset, Movidesk target and theme helper. Keep the nav sticky with dropdown `z-index` above content and visible keyboard focus.

- [ ] **Step 5: Run tests and build**

Run: `npm test; npm run build`
Expected: navigation tests and all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/report-navigation.js tests/shared/report-navigation.test.js src/main.js src/styles.css
git commit -m "feat: add responsive report navigation modes"
```

### Task 4: Betha visual tokens and dashboard migration

**Files:**
- Modify: `src/styles.css`
- Modify: `src/dashboards/balancete-receita/styles.css`
- Modify: `src/dashboards/balancete-receita/view.js`
- Modify: `tests/dashboards/balancete-receita/view.test.js`

**Interfaces:**
- Existing dashboard behavior remains unchanged; only its shell, tabs, dropdowns, controls and tokens are migrated.

- [ ] **Step 1: Add visual regression assertions for tab roles and labels**

Assert the report views retain `role="tablist"`, active `aria-selected`, visible focus styles in CSS, and no serif-only heading dependency.

- [ ] **Step 2: Run the focused view tests before styling**

Run: `node --test tests/dashboards/balancete-receita/view.test.js`
Expected: current behavior passes; new assertions fail where the old markup does not satisfy the shared pattern.

- [ ] **Step 3: Apply Betha tokens**

Use Open Sans, the blue base `#3475C1` for primary actions, gray scale for structure, semantic green/red/yellow/orange for statuses, spacing steps, moderate radii, low shadow, and AA contrast. Preserve Theorema brown only for brand accents.

- [ ] **Step 4: Migrate controls**

Style selects as native controls, tabs as `nav-tabs`-like horizontal navigation, and dropdown layers above sticky content. Add matching dark-theme tokens for every surface and border.

- [ ] **Step 5: Run full verification**

Run: `npm test; npm run build`
Expected: all tests pass, build succeeds, and no report-name path is generated by the new flow.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css src/dashboards/balancete-receita/styles.css src/dashboards/balancete-receita/view.js tests/dashboards/balancete-receita/view.test.js
git commit -m "style: align report UI with Betha patterns"
```

### Task 5: End-to-end acceptance and cleanup

**Files:**
- Modify: `tests/build.test.js`
- Modify: `README.md`
- Review: `vite.config.js`, `index.html`, `dashboards/balancete-receita/index.html`

- [ ] **Step 1: Add build assertions**

Assert the root entry exists, compatibility entry still builds, and the root bundle contains the shell entry without requiring a dashboard path navigation.

- [ ] **Step 2: Update README flow**

Document `/?protocolo=UUID` as the entry URL, `/` as the canonical post-resolution URL, session recovery, tabs/dropdown threshold and theme behavior.

- [ ] **Step 3: Run final verification**

Run: `npm test; npm run build; git diff --check`
Expected: zero test failures, successful build and no whitespace errors.

- [ ] **Step 4: Inspect final diff and status**

Run: `git diff --stat; git status --short`
Confirm unrelated `docs/betha/` files are not staged.

- [ ] **Step 5: Commit**

```bash
git add tests/build.test.js README.md vite.config.js index.html dashboards/balancete-receita/index.html
git commit -m "feat: finish single-shell report viewer"
```
