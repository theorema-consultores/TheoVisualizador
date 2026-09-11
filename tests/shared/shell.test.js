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
