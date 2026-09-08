const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeProtocol(value) {
  const protocol = String(value ?? '').trim();
  if (!UUID_PATTERN.test(protocol)) {
    throw new Error('Informe um protocolo válido.');
  }
  return protocol.toLowerCase();
}

export function resultUrl(value) {
  const protocol = normalizeProtocol(value);
  return `https://plataforma-execucoes.betha.cloud/v1/download/api/execucoes/${protocol}/resultado`;
}
