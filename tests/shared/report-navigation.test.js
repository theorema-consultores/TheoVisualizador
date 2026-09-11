import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { renderReportNavigation } from '../../src/shared/report-navigation.js';

const visualizations = Array.from({ length: 5 }, (_, index) => ({ id: 'balancete-receita', label: 'B. Receita', index }));

test('renders tabs for four visualizations and select for five', () => {
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://example.test/' });
  const container = dom.window.document.querySelector('main');
  const tabs = renderReportNavigation(container, { visualizations: visualizations.slice(0, 4), activeIndex: 0, onSelect() {}, storage: dom.window.localStorage });
  assert.ok(container.previousElementSibling.querySelector('[role="tablist"]'));
  tabs.destroy();
  renderReportNavigation(container, { visualizations, activeIndex: 0, onSelect() {}, storage: dom.window.localStorage });
  assert.ok(container.previousElementSibling.querySelector('select[name="visualizacao"]'));
});
