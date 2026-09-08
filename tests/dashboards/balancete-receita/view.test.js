import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { renderBalancete } from '../../../src/dashboards/balancete-receita/view.js';

const row = { receita: '1.1', descricao: '<script>alert(1)</script>', recurso: '1.500.01.02.03.04', origem: '01', aplicacao: '02', desdobramento: '03', detalhamento: '04', total: 120, months: Array(12).fill(10), count: 1 };
const model = { entityName: 'Prefeitura', previousYear: 2024, currentYear: 2025, previous: [row], current: [{ ...row, total: 240 }] };

test('renders six dashboard tabs and the current-year KPI', () => {
  const dom = new JSDOM('<main id="app"></main>');
  const container = dom.window.document.getElementById('app');
  renderBalancete(container, model);
  assert.equal(container.querySelectorAll('[role="tab"]').length, 6);
  assert.match(container.textContent, /Exercício Atual/);
});

test('renders descriptions as text rather than HTML', () => {
  const dom = new JSDOM('<main id="app"></main>');
  const container = dom.window.document.getElementById('app');
  renderBalancete(container, model);
  assert.equal(container.querySelector('script'), null);
  assert.match(container.textContent, /<script>alert\(1\)<\/script>/);
});

test('renders month selector and top-eight ranking', () => {
  const dom = new JSDOM('<main id="app"></main>');
  const container = dom.window.document.getElementById('app');
  renderBalancete(container, model);
  assert.equal(container.querySelectorAll('select option').length, 12);
  assert.match(container.textContent, /Top 8/);
});

test('renders expandable month-by-month detail', () => {
  const dom = new JSDOM('<main id="app"></main>');
  const container = dom.window.document.getElementById('app');
  renderBalancete(container, model);
  assert.equal(container.querySelectorAll('details').length > 0, true);
  assert.match(container.textContent, /Janeiro/);
});

test('sorts table rows when a column header is clicked', () => {
  const dom = new JSDOM('<main id="app"></main>');
  const container = dom.window.document.getElementById('app');
  renderBalancete(container, { ...model, current: [{ ...row, receita: 'A', total: 1 }, { ...row, receita: 'B', total: 2 }] });
  const header = [...container.querySelectorAll('th button')].find(button => button.textContent === 'Código');
  header.click();
  header.click();
  assert.equal(container.querySelector('tbody tr td').textContent, 'B');
});
