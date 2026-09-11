import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDashboard } from '../../src/core/dashboard-registry.js';

const metadata = { schemaVersion: '1.0.0', dashboard: { id: 'balancete-receita', version: '1.0.0' } };

test('resolves a dashboard with a label and mount function', () => {
  const dashboard = resolveDashboard(metadata);
  assert.equal(dashboard.label, 'Balancete Receita');
  assert.equal(typeof dashboard.mount, 'function');
});
