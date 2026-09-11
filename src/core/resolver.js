import { parseMetadataList } from './metadata.js';
import { normalizeProtocol } from './protocol.js';
import { resolveDashboard } from './dashboard-registry.js';

export async function resolveReport({ search, session, download, openArchive, transferStore, navigate }) {
  const rawProtocol = new URLSearchParams(search).get('protocolo');
  const protocol = normalizeProtocol(rawProtocol);
  session.setItem('report.protocol', protocol);
  await transferStore.cleanup();
  const bytes = await download(protocol);
  const archive = openArchive(bytes);
  const metadata = parseMetadataList(archive.readText('visualizacao.json'));
  const dashboard = resolveDashboard(metadata[0]);
  const transferId = await transferStore.put(bytes);
  session.setItem('report.transferId', transferId);
  session.setItem('report.dashboardId', dashboard.id);
  session.setItem('report.dashboardVersion', dashboard.version);
  navigate('/');
  return { dashboard, metadata, bytes, transferId, visualizationCount: metadata.length };
}
