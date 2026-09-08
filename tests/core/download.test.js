import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadResult } from '../../src/core/download.js';

const protocol = '6b4bec10-8f6f-47cd-b587-8b8958d5e25b';

test('downloads bytes without credentials', async () => {
  let options;
  const bytes = await downloadResult(protocol, {
    fetchImpl: async (_url, requestOptions) => {
      options = requestOptions;
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Type': 'application/zip' } });
    }
  });
  assert.deepEqual(bytes, new Uint8Array([1, 2, 3]));
  assert.equal(options.credentials, 'omit');
});

test('rejects a pending report response', async () => {
  await assert.rejects(
    () => downloadResult(protocol, { fetchImpl: async () => new Response(null, { status: 202 }) }),
    /ainda não foi concluída/i
  );
});
