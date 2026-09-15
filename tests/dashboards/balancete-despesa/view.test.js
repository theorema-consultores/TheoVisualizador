import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { renderBalanceteDespesa } from '../../../src/dashboards/balancete-despesa/view.js';

const reportStyles = [
  'src/styles.css',
  'src/dashboards/dashboard-shared.css',
  'src/dashboards/balancete-receita/styles.css',
  'src/dashboards/balancete-despesa/styles.css'
].map(path => readFileSync(resolve(path), 'utf8').replace(/@import[^;]+;/g, '')).join('\n');

const row = {
  natureDescription: '3.1.90.11 · <script>alert(1)</script>',
  natureza: '3.1.90.11',
  descricao: '<script>alert(1)</script>',
  organograma: '02.001', descricaoOrganograma: 'Gabinete',
  funcao: '04', descricaoFuncao: 'Administração',
  resource: 'Não informado', descricaoRecurso: 'Não informado',
  total: 120, months: Array(12).fill(10), count: 1, entityName: 'Prefeitura'
};

const model = {
  entityName: 'Prefeitura', previousYear: 2025, currentYear: 2026,
  previous: [row], current: [{ ...row, total: 240 }],
  execution: {
    protocol: '2bec0170-1577-4a8b-8379-a4f1b2d4d6b8',
    user: 'brunotheorema',
    issues: [{ year: 2025, dateTime: '15/09/2026, às 09:19:17' }]
  }
};

test('renders the reference expense dashboard structure', () => {
  const dom = new JSDOM('<main id="app"></main>');
  const container = dom.window.document.getElementById('app');
  renderBalanceteDespesa(container, model);

  assert.equal(container.querySelectorAll('[role="tab"]').length, 6);
  assert.equal(container.querySelectorAll('.filter-control').length, 5);
  assert.equal(container.querySelectorAll('.bar-row').length, 1);
  assert.ok(container.querySelector('.execution-panel'));
  assert.equal(container.querySelector('.source-panel'), null);
  assert.match(container.textContent, /Dashboard Comparativo de Balancete da Despesa/);
  assert.match(container.textContent, /Exercício atual/);
});

test('uses accessible dropdowns and renders report data as text', () => {
  const dom = new JSDOM('<main id="app"></main>');
  const container = dom.window.document.getElementById('app');
  renderBalanceteDespesa(container, model);

  const dropdown = container.querySelector('.filter-control');
  const toggle = dropdown.querySelector('.dropdown-toggle');
  const menu = dropdown.querySelector('.dropdown-menu');
  assert.equal(toggle.getAttribute('aria-haspopup'), 'listbox');
  assert.equal(menu.querySelectorAll('.dropdown-item').length, 12);
  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  toggle.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(menu.hidden, true);
  assert.equal(container.querySelector('script'), null);
  assert.match(container.textContent, /<script>alert\(1\)<\/script>/);
});

test('keeps the report toolbar, ranking descriptions and month bars within their panels', () => {
  const dom = new JSDOM(`<style>${reportStyles}</style><main id="app"></main>`, { pretendToBeVisual: true });
  const container = dom.window.document.getElementById('app');
  renderBalanceteDespesa(container, model);

  const toolbar = container.querySelector('.toolbar');
  const search = toolbar.querySelector('.search-input');
  const action = toolbar.querySelector('.secondary-action');
  const ranking = container.querySelector('.rank');
  const rankingLabel = container.querySelector('.rankline span');
  const chart = container.querySelector('.months-chart');
  const bar = chart.querySelector('.month-bar');

  assert.equal(dom.window.getComputedStyle(toolbar).alignItems, 'flex-start');
  assert.equal(dom.window.getComputedStyle(search).height, dom.window.getComputedStyle(action).height);
  assert.equal(dom.window.getComputedStyle(action).flex, '0 0 auto');
  assert.equal(dom.window.getComputedStyle(ranking).display, 'block');
  assert.equal(dom.window.getComputedStyle(rankingLabel).whiteSpace, 'normal');
  assert.equal(dom.window.getComputedStyle(bar).width, 'auto');
  assert.equal(dom.window.getComputedStyle(bar).minWidth, '0');
  assert.equal(dom.window.getComputedStyle(bar).flexBasis, '0px');
});
