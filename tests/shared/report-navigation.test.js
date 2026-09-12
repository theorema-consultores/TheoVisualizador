import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { renderReportNavigation } from '../../src/shared/report-navigation.js';

test('uses consistent Betha-style header control sizing and UI font', () => {
  const styles = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.app-nav\s*\{[^}]*min-height:\s*4rem/s);
  assert.match(styles, /\.app-nav\s*\{[^}]*padding:\s*0\s+max\(/s);
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

test('renders Betha-style horizontal tabs for any number of visualizations', () => {
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://example.test/' });
  const container = dom.window.document.querySelector('main');
  const tabs = renderReportNavigation(container, { visualizations: visualizations.slice(0, 4), activeIndex: 0, onSelect() {}, storage: dom.window.localStorage });
  assert.equal(container.previousElementSibling.querySelector('.brand').getAttribute('href'), './?home=1');
  assert.ok(container.previousElementSibling.querySelector('[role="tablist"]'));
  tabs.destroy();
  renderReportNavigation(container, { visualizations, activeIndex: 0, onSelect() {}, storage: dom.window.localStorage });
  const many = renderReportNavigation(container, { visualizations: [...visualizations, ...visualizations], activeIndex: 0, onSelect() {}, storage: dom.window.localStorage });
  assert.equal(container.previousElementSibling.querySelectorAll('[role="tab"]').length, 10);
  assert.equal(container.previousElementSibling.querySelector('[aria-selected="true"]').textContent, 'Balancete Receita 1');
  many.destroy();
});
