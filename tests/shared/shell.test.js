import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { renderProtocolPrompt } from '../../src/shared/shell.js';

test('renders a protocol field and navigates after submission', () => {
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://example.test/' });
  const container = dom.window.document.getElementById('app');
  let target;
  renderProtocolPrompt(container, { navigate: url => { target = url; } });
  const input = container.querySelector('input[name="protocolo"]');
  input.value = '6b4bec10-8f6f-47cd-b587-8b8958d5e25b';
  container.querySelector('form').requestSubmit();
  assert.equal(target, '?protocolo=6b4bec10-8f6f-47cd-b587-8b8958d5e25b');
});

test('renders recent protocols and uses the selected one', () => {
  const dom = new JSDOM('<main id="app"></main>', { url: 'https://example.test/' });
  const container = dom.window.document.getElementById('app');
  dom.window.localStorage.setItem('report.recentProtocols', JSON.stringify([
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  ]));
  let target;
  renderProtocolPrompt(container, { navigate: url => { target = url; } });
  const recent = container.querySelector('.protocol-dropdown');
  assert.equal(recent.classList.contains('dropdown'), true);
  assert.equal(recent.querySelectorAll('[role="option"]').length, 2);
  recent.querySelector('.dropdown-toggle').click();
  recent.querySelector('[role="option"]').click();
  container.querySelector('form').requestSubmit();
  assert.equal(target, '?protocolo=11111111-1111-4111-8111-111111111111');
});
