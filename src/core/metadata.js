const VERSION = '1.0.0';
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseMetadata(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Os metadados do relatório não são um JSON válido.');
  }
  const keys = Object.keys(value ?? {}).sort();
  if (keys.join(',') !== 'dashboard,schemaVersion' || value.schemaVersion !== VERSION) {
    throw new Error('Os metadados do relatório não são compatíveis.');
  }
  const dashboard = value.dashboard;
  if (!dashboard || Object.keys(dashboard).sort().join(',') !== 'id,version' || !ID_PATTERN.test(dashboard.id) || dashboard.version !== VERSION) {
    throw new Error('Os metadados do relatório não são compatíveis.');
  }
  return { schemaVersion: VERSION, dashboard: { id: dashboard.id, version: dashboard.version } };
}

export function parseMetadataList(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('Os metadados do relatório não são um JSON válido.'); }
  const list = Array.isArray(value) ? value : [value];
  if (!list.length) throw new Error('Os metadados do relatório não são compatíveis.');
  return list.map(item => parseMetadata(JSON.stringify(item)));
}
