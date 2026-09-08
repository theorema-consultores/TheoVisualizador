# Visualizador de relatórios por protocolo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um visualizador estático multipágina que resolve uma emissão por protocolo e abre `balancete-receita@1.0.0` a partir de um ZIP público.

**Architecture:** A página raiz valida e baixa o ZIP, valida `visualizacao.json`, grava uma transferência temporária no IndexedDB e abre a página física do dashboard. O dashboard usa um runtime comum para recuperar ou baixar novamente o ZIP e interpreta os seus próprios JSONs por meio de uma interface somente leitura de arquivo.

**Tech Stack:** Vite, JavaScript ES Modules, HTML/CSS nativos, `fflate`, Node test runner, jsdom e GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-08-visualizador-relatorios-design.md`

## Global Constraints

- O produto é estático, público e publicado no GitHub Pages em subcaminho de repositório.
- Não usar TypeScript, framework de UI, backend, banco de dados, upload manual ou autenticação.
- Aceitar somente protocolo UUID hexadecimal no parâmetro `protocolo` e baixar sem cookies.
- Remover o protocolo da URL apenas após a transferência estar pronta; mantê-lo somente no `sessionStorage` da aba.
- Exigir `visualizacao.json` único na raiz, com `schemaVersion`, `dashboard.id` e `dashboard.version` iguais às versões registradas.
- Nunca executar conteúdo do ZIP; inserir dados de JSON como texto.
- Centralizar limites: ZIP 25 MB, 500 JSONs, 10 MB de JSON expandido e timeout de 30 segundos.
- Cada dashboard é responsável por localizar e validar seus próprios arquivos.
- `balancete-receita@1.0.0` abre um único `balancete-receita.json` por basename, inclusive em subpastas.
- Preservar `source-base` como referência não modificada.

---

## Estrutura alvo

```text
package.json
vite.config.js
index.html
src/
├── main.js
├── styles.css
├── core/
│   ├── protocol.js
│   ├── download.js
│   ├── archive.js
│   ├── metadata.js
│   ├── dashboard-registry.js
│   ├── transfer-store.js
│   ├── resolver.js
│   └── dashboard-runtime.js
├── shared/
│   ├── shell.js
│   ├── shell.css
│   └── errors.js
└── dashboards/
    └── balancete-receita/
        ├── index.html
        ├── index.js
        ├── data.js
        ├── view.js
        ├── glossary.js
        └── styles.css
tests/
├── helpers/
│   ├── dom.js
│   └── zip.js
├── core/
│   ├── protocol.test.js
│   ├── metadata.test.js
│   ├── archive.test.js
│   ├── transfer-store.test.js
│   └── resolver.test.js
└── dashboards/
    └── balancete-receita/
        ├── data.test.js
        └── view.test.js
.github/workflows/deploy-pages.yml
README.md
```

### Task 1: Scaffold, build e comando de teste confiável

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `tests/core/protocol.test.js`
- Create: `.gitignore`

**Interfaces:**
- Produces `npm run dev`, `npm test`, `npm run build` e `npm run check`.
- Produces a base Vite build rooted at the resolvedora page; the Balancete HTML input is added in Task 6 when its page exists.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProtocol } from '../../src/core/protocol.js';

test('normalizes a valid protocol', () => {
  assert.equal(
    normalizeProtocol(' 6B4BEC10-8F6F-47CD-B587-8B8958D5E25B '),
    '6b4bec10-8f6f-47cd-b587-8b8958d5e25b'
  );
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `node --test tests/core/protocol.test.js`

Expected: fail because `src/core/protocol.js` does not exist.

- [ ] **Step 3: Create project configuration and the minimal module**

```js
export function normalizeProtocol(value) {
  const protocol = String(value ?? '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(protocol)) {
    throw new Error('Informe um protocolo válido.');
  }
  return protocol.toLowerCase();
}
```

Configure `npm test` through a small Node script that discovers `*.test.js` recursively and exits nonzero when zero tests are discovered. Configure Vite with relative assets (`base: './'`) and only the root HTML input.

- [ ] **Step 4: Run RED test and project checks to verify GREEN**

Run: `npm test && npm run check && npm run build`

Expected: all commands exit 0 and `dist/index.html` is generated.

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.js index.html src/main.js tests/core/protocol.test.js .gitignore
git commit -m "build: scaffold report viewer"
```

### Task 2: Protocol, download and metadata contracts

**Files:**
- Modify: `src/core/protocol.js`
- Create: `src/core/download.js`
- Create: `src/core/metadata.js`
- Create: `src/core/dashboard-registry.js`
- Create: `tests/core/metadata.test.js`
- Modify: `tests/core/protocol.test.js`

**Interfaces:**
- Produces `resultUrl(protocol)`, `downloadResult(protocol, options)`, `parseMetadata(text)` and `resolveDashboard(metadata)`.
- `downloadResult` returns `Uint8Array` and accepts injected `fetchImpl` and `signal` for tests.
- `parseMetadata` returns `{ schemaVersion, dashboard: { id, version } }` only for the exact 1.0.0 schema.

- [ ] **Step 1: Write failing tests**

```js
test('rejects metadata with a data-file declaration', () => {
  assert.throws(
    () => parseMetadata('{"schemaVersion":"1.0.0","dashboard":{"id":"balancete-receita","version":"1.0.0"},"files":{}}'),
    /metadados/i
  );
});

test('maps a registered dashboard version to its physical page', () => {
  assert.deepEqual(resolveDashboard(validMetadata), {
    id: 'balancete-receita', version: '1.0.0', page: 'dashboards/balancete-receita/'
  });
});
```

- [ ] **Step 2: Run targeted tests to verify RED**

Run: `node --test tests/core/metadata.test.js`

Expected: fail because metadata and registry modules do not exist.

- [ ] **Step 3: Implement minimal contracts**

Implement exact-key validation for metadata, a static dashboard registry, streamed download size checking, timeout handling at the caller, and explicit errors for HTTP 202, 401/403, 404/410, 429, HTML response and missing response body.

- [ ] **Step 4: Run targeted and complete tests to verify GREEN**

Run: `npm test`

Expected: all tests pass, including invalid UUID, malformed metadata, unknown dashboard, incompatible version and oversized download cases.

- [ ] **Step 5: Commit**

```bash
git add src/core tests/core
git commit -m "feat(core): validate report metadata"
```

### Task 3: ZIP archive and temporary transfer store

**Files:**
- Create: `src/core/archive.js`
- Create: `src/core/transfer-store.js`
- Create: `tests/helpers/zip.js`
- Create: `tests/core/archive.test.js`
- Create: `tests/core/transfer-store.test.js`

**Interfaces:**
- Produces `openArchive(bytes)` with `listEntries`, `findByBasename`, `readBytes`, `readText` and `readJson`.
- Produces `createTransferStore(indexedDB)` with `put(bytes)`, `take(id)` and `cleanup(now)`.
- `put` returns an opaque random transfer id; `take` atomically reads and deletes a record.

- [ ] **Step 1: Write failing archive and transfer tests**

```js
test('finds exactly one case-insensitive basename in a subfolder', async () => {
  const archive = await openArchive(zipOf({ 'dados/Balancete-Receita.JSON': '{"ok":true}' }));
  assert.deepEqual(archive.findByBasename('balancete-receita.json'), ['dados/Balancete-Receita.JSON']);
});

test('takes a transfer once and deletes it', async () => {
  const store = createTransferStore(indexedDB);
  const id = await store.put(new Uint8Array([1, 2]));
  assert.deepEqual(await store.take(id), new Uint8Array([1, 2]));
  assert.equal(await store.take(id), null);
});
```

- [ ] **Step 2: Run targeted tests to verify RED**

Run: `node --test tests/core/archive.test.js tests/core/transfer-store.test.js`

Expected: fail because archive and transfer modules do not exist.

- [ ] **Step 3: Implement the minimal archive and transfer layers**

Use the bundled `fflate` package for ZIP reading. Reject encrypted or invalid archives, enforce limits while filtering JSON entries, decode text as UTF-8 with fatal mode, require exact root `visualizacao.json`, and use IndexedDB records `{ id, bytes, createdAt }` with one-hour cleanup.

- [ ] **Step 4: Run complete test suite to verify GREEN**

Run: `npm test`

Expected: valid ZIPs, invalid JSON, duplicate names, transfer consumption and stale cleanup tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/archive.js src/core/transfer-store.js tests/helpers/zip.js tests/core/archive.test.js tests/core/transfer-store.test.js
git commit -m "feat(core): add archive transfer flow"
```

### Task 4: Resolvedora, runtime and shared shell

**Files:**
- Create: `src/core/resolver.js`
- Create: `src/core/dashboard-runtime.js`
- Create: `src/shared/shell.js`
- Create: `src/shared/shell.css`
- Create: `src/shared/errors.js`
- Modify: `src/main.js`
- Modify: `index.html`
- Create: `tests/helpers/dom.js`
- Create: `tests/core/resolver.test.js`

**Interfaces:**
- Produces `resolveReport({ location, sessionStorage, transferStore, download, openArchive, navigate })`.
- Produces `startDashboard({ id, version, load, render, dependencies })`.
- `resolveReport` calls `navigate(page)` only after storing the ZIP and saves both protocol and transfer id in session storage.

- [ ] **Step 1: Write failing resolver tests**

```js
test('stores ZIP then navigates to registered dashboard without protocol in the target URL', async () => {
  const result = await resolveReport(dependenciesForValidZip);
  assert.equal(result.page, 'dashboards/balancete-receita/');
  assert.equal(sessionStorage.getItem('report.protocol'), validProtocol);
  assert.match(navigate.mock.calls[0][0], /dashboards\/balancete-receita\/$/);
});
```

- [ ] **Step 2: Run resolver tests to verify RED**

Run: `node --test tests/core/resolver.test.js`

Expected: fail because resolver and runtime do not exist.

- [ ] **Step 3: Implement resolvedora and runtime**

Implement session keys scoped to the current tab, `location.replace` navigation, transfer retrieval, fallback redownload on refresh, dashboard identity verification and shell states for loading, retry and errors. Use textContent for error messages.

- [ ] **Step 4: Run complete tests and build to verify GREEN**

Run: `npm test && npm run build`

Expected: resolver tests pass and generated pages contain only relative asset URLs.

- [ ] **Step 5: Commit**

```bash
git add src/core/resolver.js src/core/dashboard-runtime.js src/shared src/main.js index.html tests/helpers/dom.js tests/core/resolver.test.js
git commit -m "feat: resolve reports into dashboard pages"
```

### Task 5: Balancete data model and glossary

**Files:**
- Create: `src/dashboards/balancete-receita/data.js`
- Create: `src/dashboards/balancete-receita/glossary.js`
- Create: `tests/dashboards/balancete-receita/data.test.js`

**Interfaces:**
- Produces `loadBalancete(archive)`, `parseResource(resource)`, `aggregate(records, grouping)` and `formatVariation(current, previous)`.
- `loadBalancete` returns `{ entityName, previousYear, currentYear, previous, current }`.

- [ ] **Step 1: Write failing data tests**

```js
test('keeps only analytical records and orders exercises', async () => {
  const model = await loadBalancete(archiveWithTwoYears);
  assert.equal(model.previousYear, 2024);
  assert.equal(model.currentYear, 2025);
  assert.equal(model.current.length, 1);
});

test('uses fallback resource components for an incomplete resource code', () => {
  assert.deepEqual(parseResource('1.500'), {
    origem: '99', aplicacao: '99', desdobramento: '00', detalhamento: '00'
  });
});
```

- [ ] **Step 2: Run data tests to verify RED**

Run: `node --test tests/dashboards/balancete-receita/data.test.js`

Expected: fail because the dashboard data modules do not exist.

- [ ] **Step 3: Implement data transformation**

Locate exactly one `balancete-receita.json`, require two distinct years, filter `tipoNatureza === 'A'`, validate finite monetary values, retain empty analytical years, select the first nonempty entity name, move current glossaries into `glossary.js`, and implement the specified third-to-sixth segment resource algorithm.

- [ ] **Step 4: Run complete tests to verify GREEN**

Run: `npm test`

Expected: data validation, empty-report, zero-baseline variation, grouping and resource parsing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/dashboards/balancete-receita/data.js src/dashboards/balancete-receita/glossary.js tests/dashboards/balancete-receita/data.test.js
git commit -m "feat(balancete): add validated data model"
```

### Task 6: Balancete page and interactive visualization

**Files:**
- Create: `src/dashboards/balancete-receita/index.html`
- Create: `src/dashboards/balancete-receita/index.js`
- Create: `src/dashboards/balancete-receita/view.js`
- Create: `src/dashboards/balancete-receita/styles.css`
- Create: `tests/dashboards/balancete-receita/view.test.js`
- Modify: `vite.config.js`

**Interfaces:**
- `renderBalancete(container, model)` renders the dashboard and returns `{ destroy() }`.
- Page registration calls `startDashboard({ id: 'balancete-receita', version: '1.0.0', load: loadBalancete, render: renderBalancete })`.

- [ ] **Step 1: Write failing view tests**

```js
test('renders six dashboard tabs and the current-year KPI', () => {
  const { container } = createDomContainer();
  renderBalancete(container, modelFixture);
  assert.equal(container.querySelectorAll('[role="tab"]').length, 6);
  assert.match(container.textContent, /Exercício Atual/);
});

test('renders JSON descriptions as text rather than HTML', () => {
  const { container } = createDomContainer();
  renderBalancete(container, modelWithHtmlDescription);
  assert.equal(container.querySelector('script'), null);
  assert.match(container.textContent, /<script>/);
});
```

- [ ] **Step 2: Run view tests to verify RED**

Run: `node --test tests/dashboards/balancete-receita/view.test.js`

Expected: fail because the view module does not exist.

- [ ] **Step 3: Implement the accessible visualização**

Build the shell-integrated header, KPIs, month selector, six keyboard-accessible tabs, top-eight ranking, filters, sortable tables and expandable monthly detail using DOM APIs and `textContent`. Add the physical Balancete HTML file to Vite's Rollup inputs. Format currency as BRL/pt-BR, show `—` for zero-base percentage variation and render a valid empty state for no analytical records.

- [ ] **Step 4: Run tests, checks and production build to verify GREEN**

Run: `npm test && npm run check && npm run build`

Expected: view tests pass, no generated HTML contains unescaped data interpolation, and the Balancete physical page is in `dist`.

- [ ] **Step 5: Commit**

```bash
git add src/dashboards/balancete-receita tests/dashboards/balancete-receita
git commit -m "feat(balancete): render comparative dashboard"
```

### Task 7: Documentation, Pages workflow and final verification

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Create: `README.md`
- Modify: `package.json`
- Modify: `docs/superpowers/specs/2026-09-08-visualizador-relatorios-design.md`

**Interfaces:**
- Produces a reproducible workflow that tests, builds and deploys `dist` to GitHub Pages.
- Produces operating documentation for the external link format and ZIP metadata contract.

- [ ] **Step 1: Write failing build-contract test**

```js
test('build exposes the resolver and Balancete page', async () => {
  await runBuild();
  assert.equal(await exists('dist/index.html'), true);
  assert.equal(await exists('dist/dashboards/balancete-receita/index.html'), true);
});
```

- [ ] **Step 2: Run the build-contract test to verify RED**

Run: `node --test tests/build.test.js`

Expected: fail before the Pages workflow and final build configuration are complete.

- [ ] **Step 3: Implement workflow and documentation**

Use `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`. Document the public `?protocolo=UUID` entry URL, `visualizacao.json@1.0.0`, browser storage behavior, no-data retention policy and local verification commands.

- [ ] **Step 4: Verify all acceptance criteria**

Run: `npm test && npm run check && npm run build && git diff --check`

Expected: all tests, syntax checks and build steps pass with no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy-pages.yml README.md package.json tests/build.test.js docs/superpowers/specs/2026-09-08-visualizador-relatorios-design.md
git commit -m "ci: publish report viewer to pages"
```

## Plan self-review

- Spec coverage: Tasks 1–4 implement static multipage flow, protocol, public download, metadata validation, transfer, recovery, shell and errors. Tasks 5–6 implement every Balancete requirement. Task 7 implements Pages delivery, documentation and end-to-end build verification.
- Placeholder scan: all task steps name exact files, interfaces, commands and expected behavior; no deferred implementation markers remain.
- Type consistency: `openArchive` feeds `load(archive)`; `loadBalancete` feeds `renderBalancete`; the registry identity is the same `balancete-receita@1.0.0` across resolver, runtime and page.
