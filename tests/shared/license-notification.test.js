import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { notifyMissingLicenses } from '../../src/shared/license-notification.js';

class FakeNotyf {
  constructor(options) { this.options = options; }
  open(options) {
    this.openOptions = options;
    this.notification = { on: () => this.notification };
    return this.notification;
  }
  dismiss(notification) { this.dismissed = notification; }
}

test('uses the shared Betha visual tokens for the notification action', () => {
  const styles = readFileSync(new URL('../../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.license-notification\s*\{[^}]*font-family:\s*var\(--font-ui\)/s);
  assert.match(styles, /\.license-notification \.notyf__dismiss\s*\{[^}]*top:\s*\.5rem[^}]*right:\s*\.5rem/s);
  assert.match(styles, /\.license-notification__actions\s*\{[^}]*justify-content:\s*flex-end/s);
  assert.match(styles, /\.license-notification__support\s*\{[^}]*background:\s*#2e7d32/s);
});

function environment({ focused = true } = {}) {
  const listeners = {};
  const doc = { visibilityState: 'visible', hasFocus: () => focused, addEventListener: (type, fn) => { listeners[type] = fn; } };
  const view = { addEventListener: (type, fn) => { listeners[type] = fn; } };
  return { doc, view, listeners };
}

test('renders missing licenses with a support action', () => {
  const env = environment();
  const message = { innerHTML: '' };
  const dismissButton = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
  const toast = {
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector(selector) { return selector === '.notyf__message' ? message : dismissButton; }
  };
  env.doc.querySelectorAll = () => [toast];
  const notyf = notifyMissingLicenses({
    document: env.doc,
    window: env.view,
    NotyfClass: FakeNotyf,
    licenses: ['Relatório Caixa', 'Relatório Saúde'],
    supportUrl: 'https://support.example.test/',
    clock: { now: () => 0, setTimeout: () => ({}), clearTimeout() {} }
  });

  assert.deepEqual(notyf.options.position, { x: 'left', y: 'bottom' });
  assert.equal(notyf.options.duration, 0);
  assert.doesNotMatch(notyf.openOptions.message, /</);
  assert.match(notyf.openOptions.message, /Relatório Caixa/);
  assert.match(notyf.openOptions.message, /Relatório Saúde/);
  assert.match(message.innerHTML, /license-notification__title/);
  assert.match(message.innerHTML, /license-notification__text/);
  assert.match(message.innerHTML, /license-notification__actions/);
  assert.match(message.innerHTML, /href="https:\/\/support\.example\.test\//);
  assert.match(message.innerHTML, />Acionar suporte</);
  assert.equal(toast.attributes.role, 'status');
  assert.equal(dismissButton.attributes['aria-label'], 'Fechar notificação de licenças sem acesso');
});

test('counts the ten-second duration only while the window is focused', () => {
  let now = 0;
  let nextTimer;
  const clock = {
    now: () => now,
    setTimeout: (callback, delay) => { nextTimer = { callback, delay }; return nextTimer; },
    clearTimeout: timer => { if (nextTimer === timer) nextTimer = null; }
  };
  const env = environment();
  const instance = notifyMissingLicenses({ document: env.doc, window: env.view, NotyfClass: FakeNotyf, licenses: ['Relatório Caixa'], clock });
  assert.equal(nextTimer.delay, 10000);

  now = 4000;
  env.doc.hasFocus = () => false;
  env.listeners.blur();
  assert.equal(nextTimer, null);

  now = 7000;
  env.doc.hasFocus = () => true;
  env.listeners.focus();
  assert.equal(nextTimer.delay, 6000);

  now = 13000;
  nextTimer.callback();
  assert.equal(instance.dismissed, instance.notification);
});

test('binds browser timers to the window that owns them', () => {
  const env = environment();
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const browserSetTimeout = function () {
    if (this !== env.view) throw new TypeError('Illegal invocation');
    return {};
  };
  env.view.setTimeout = browserSetTimeout;
  env.view.clearTimeout = () => {};
  globalThis.setTimeout = browserSetTimeout;
  globalThis.clearTimeout = env.view.clearTimeout;
  try {
    assert.doesNotThrow(() => notifyMissingLicenses({ document: env.doc, window: env.view, NotyfClass: FakeNotyf, licenses: ['Relatório Caixa'] }));
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
