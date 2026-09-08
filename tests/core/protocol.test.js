import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProtocol } from '../../src/core/protocol.js';

test('normalizes a valid protocol', () => {
  assert.equal(
    normalizeProtocol(' 6B4BEC10-8F6F-47CD-B587-8B8958D5E25B '),
    '6b4bec10-8f6f-47cd-b587-8b8958d5e25b'
  );
});

test('rejects a protocol outside the UUID shape', () => {
  assert.throws(() => normalizeProtocol('not-a-uuid'), /protocolo válido/i);
});
