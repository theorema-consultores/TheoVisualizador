import assert from 'node:assert/strict';
import test from 'node:test';
import { indexedDB } from 'fake-indexeddb';
import { createTransferStore } from '../../src/core/transfer-store.js';

test('takes a transfer once and deletes it', async () => {
  const store = createTransferStore(indexedDB, { databaseName: `test-${crypto.randomUUID()}` });
  const id = await store.put(new Uint8Array([1, 2]));
  assert.deepEqual(await store.take(id), new Uint8Array([1, 2]));
  assert.equal(await store.take(id), null);
});

test('removes stale transfers after one hour', async () => {
  const store = createTransferStore(indexedDB, { databaseName: `test-${crypto.randomUUID()}`, now: () => 4_000_000 });
  const id = await store.put(new Uint8Array([3]));
  await store.cleanup(4_000_000 + 3_600_001);
  assert.equal(await store.take(id), null);
});
