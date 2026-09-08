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

test('aborts a download that exceeds its timeout', async () => {
  await assert.rejects(
    () => downloadResult(protocol, {
      timeoutMs: 1,
      fetchImpl: async (_url, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))
    }),
    /30 segundos|tempo/i
  );
});

test('stops streamed data once the ZIP limit is exceeded', async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(4)); controller.close(); } });
  await assert.rejects(
    () => downloadResult(protocol, { maxBytes: 3, fetchImpl: async () => new Response(stream, { status: 200 }) }),
    /limite/i
  );
});
