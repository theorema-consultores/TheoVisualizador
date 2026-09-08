import { resultUrl } from './protocol.js';

export const MAX_ZIP_BYTES = 25 * 1024 * 1024;

function messageFor(response) {
  if (response.status === 202) return 'A execução ainda não foi concluída.';
  if (response.status === 401 || response.status === 403) return 'O resultado não está disponível publicamente.';
  if (response.status === 404 || response.status === 410) return 'O resultado não está disponível para este protocolo.';
  if (response.status === 429) return 'Muitas solicitações foram feitas. Tente novamente em instantes.';
  if (!response.ok) return `O resultado não está disponível (HTTP ${response.status}).`;
  if (/text\/html/i.test(response.headers.get('content-type') ?? '')) return 'O serviço retornou uma página em vez do ZIP.';
  return null;
}

export async function downloadResult(protocol, { fetchImpl = fetch, signal, timeoutMs = 30_000, maxBytes = MAX_ZIP_BYTES } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try { response = await fetchImpl(resultUrl(protocol), { credentials: 'omit', signal: controller.signal }); }
  catch (error) {
    if (controller.signal.aborted) throw new Error('A API não respondeu dentro do tempo limite de 30 segundos.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  const message = messageFor(response);
  if (message) throw new Error(message);
  const expected = Number(response.headers.get('content-length'));
  if (expected > maxBytes) throw new Error('O ZIP ultrapassa o limite de 25 MB.');
  if (!response.body) throw new Error('O serviço não retornou um arquivo ZIP.');
  const reader = response.body.getReader(); const chunks = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength; if (total > maxBytes) throw new Error('O ZIP ultrapassa o limite de 25 MB.');
      chunks.push(value);
    }
  } finally { try { await reader.cancel(); } catch {} reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
