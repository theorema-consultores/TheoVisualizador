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

export async function downloadResult(protocol, { fetchImpl = fetch, signal } = {}) {
  const response = await fetchImpl(resultUrl(protocol), { credentials: 'omit', signal });
  const message = messageFor(response);
  if (message) throw new Error(message);
  const expected = Number(response.headers.get('content-length'));
  if (expected > MAX_ZIP_BYTES) throw new Error('O ZIP ultrapassa o limite de 25 MB.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_ZIP_BYTES) throw new Error('O ZIP ultrapassa o limite de 25 MB.');
  return bytes;
}
