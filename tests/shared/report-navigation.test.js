import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { renderReportNavigation } from '../../src/shared/report-navigation.js';

test('uses consistent Betha-style header control sizing and UI font', () => {
  const styles = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.app-nav\s*\{[^}]*min-height:\s*4rem/s);
  assert.match(styles, /\.app-nav\s*\{[^}]*margin-left:\s*var\(--sidebar-width\)/s);
  assert.match(styles, /\.app-sidebar\s*\{[^}]*width:\s*var\(--sidebar-width\)/s);
  assert.match(styles, /\.theme-toggle\s*\{[^}]*height:\s*2\.5rem/s);
  assert.match(styles, /\.support-link\s*\{[^}]*height:\s*2\.5rem/s);
  assert.match(styles, /\.support-link\s*\{[^}]*font:\s*700\s+\.8rem\/1\.2\s+var\(--font-ui\)/s);
});

test('styles the recent protocol selector like the protocol field', () => {
  const styles = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.protocol-form input, \.protocol-form select\s*\{[^}]*min-height:\s*2\.75rem/s);
  assert.match(styles, /\.protocol-form input, \.protocol-form select\s*\{[^}]*font:\s*inherit/s);
});

const visualizations = Array.from({ length: 5 }, (_, index) => ({ id: 'balancete-receita', label: 'Balancete Receita', index }));

test('renders the left dashboard menu with an active accessible item', () => {
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://example.test/' });
  const container = dom.window.document.querySelector('main');
  const selected = [];
  const navigation = renderReportNavigation(container, { visualizations: visualizations.slice(0, 4), activeIndex: 1, onSelect: index => selected.push(index), storage: dom.window.localStorage });
  const sidebar = dom.window.document.querySelector('.app-sidebar');
  assert.equal(container.previousElementSibling.className, 'app-nav');
  assert.equal(sidebar.querySelector('.brand').getAttribute('href'), './?home=1');
  assert.ok(sidebar.querySelector('[role="tablist"]'));
  assert.equal(sidebar.querySelectorAll('[role="tab"]').length, 4);
  assert.equal(sidebar.querySelector('[aria-selected="true"]').lastChild.textContent, 'Receita 2');
  sidebar.querySelectorAll('[role="tab"]')[2].click();
  assert.deepEqual(selected, [2]);
  navigation.destroy();
  assert.equal(dom.window.document.querySelector('.app-sidebar'), null);
  assert.equal(dom.window.document.querySelector('.app-nav'), null);
});

test('labels the dashboard menu with concise report names', () => {
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://example.test/' });
  const container = dom.window.document.querySelector('main');
  renderReportNavigation(container, {
    visualizations: [{ id: 'balancete-receita', label: 'Balancete Receita' }, { id: 'balancete-despesa', label: 'Balancete Despesa' }],
    activeIndex: 0,
    onSelect() {},
    storage: dom.window.localStorage
  });
  assert.deepEqual([...dom.window.document.querySelectorAll('.app-sidebar [role="tab"]')].map(item => item.lastChild.textContent), ['Receita', 'Despesa']);
  assert.equal(dom.window.document.querySelector('.breadcrumb-current').textContent, 'Receita');
});

test('shows the municipality provided by the loaded report', () => {
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://example.test/' });
  const container = dom.window.document.querySelector('main');
  renderReportNavigation(container, {
    visualizations: [{ id: 'balancete-receita', label: 'Balancete Receita' }],
    activeIndex: 0,
    municipality: 'Prefeitura de Sertaneja',
    onSelect() {},
    storage: dom.window.localStorage
  });
  assert.equal(dom.window.document.querySelector('.municipality-name').textContent, 'Prefeitura de Sertaneja');
});

test('keeps duplicate labels distinguishable in the dashboard menu', () => {
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://example.test/' });
  const container = dom.window.document.querySelector('main');
  renderReportNavigation(container, { visualizations, activeIndex: 0, onSelect() {}, storage: dom.window.localStorage });
  assert.equal(dom.window.document.querySelector('.app-sidebar').querySelectorAll('[role="tab"]').length, 5);
  assert.equal(dom.window.document.querySelector('.app-sidebar').querySelector('[aria-selected="true"]').lastChild.textContent, 'Receita 1');
});
