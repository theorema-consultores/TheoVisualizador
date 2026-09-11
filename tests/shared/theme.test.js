import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { initializeTheme, toggleTheme } from '../../src/shared/theme.js';

test('uses and persists the selected theme', () => {
  const dom = new JSDOM('<!doctype html><html></html>');
  const storage = new Map();
  const store = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  assert.equal(initializeTheme({ document: dom.window.document, storage: store, prefersDark: true }), 'dark');
  assert.equal(toggleTheme({ document: dom.window.document, storage: store }), 'light');
  assert.equal(storage.get('theorema.theme'), 'light');
});
