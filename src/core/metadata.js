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

function parseView(value) {
  const keys = Object.keys(value ?? {}).sort().join(',');
  const hasValidKeys = keys === 'id,nome,relatorios' || keys === 'id,nome,relatorios,temasSemLicenca';
  if (!value || !hasValidKeys || !ID_PATTERN.test(value.id) || typeof value.nome !== 'string' || !Array.isArray(value.relatorios) || !value.relatorios.length || (value.temasSemLicenca !== undefined && !Array.isArray(value.temasSemLicenca))) {
    throw new Error('Os metadados da visão não são compatíveis.');
  }
  return value.relatorios.map(report => {
    if (!report || !report.id || !report.version || !report.arquivo) throw new Error('Os metadados da visão não são compatíveis.');
    const metadata = parseMetadata(JSON.stringify({ schemaVersion: VERSION, dashboard: { id: report.id, version: report.version } }));
    return { ...metadata, arquivo: report.arquivo };
  });
}

export function parseMetadataList(text) {
  return parseVisualizationMetadata(text).metadata;
}

export function parseVisualizationMetadata(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('Os metadados do relatório não são um JSON válido.'); }
  if (value?.visao) {
    if (value.schemaVersion !== VERSION) throw new Error('Os metadados da visão não são compatíveis.');
    return {
      metadata: parseView(value.visao),
      missingLicenses: (value.visao.temasSemLicenca ?? []).filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean)
    };
  }
  const list = Array.isArray(value) ? value : [value];
  if (!list.length) throw new Error('Os metadados do relatório não são compatíveis.');
  return { metadata: list.map(item => parseMetadata(JSON.stringify(item))), missingLicenses: [] };
}
