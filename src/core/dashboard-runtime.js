import { parseMetadataList } from './metadata.js';
import { resolveDashboard } from './dashboard-registry.js';
import { openArchive } from './archive.js';

export async function startDashboard({ id, version, load, render, session = sessionStorage, transferStore, download, container = document.getElementById('app'), visualizationIndex = 0, onVisualizations }) {
  const transferId = session.getItem('report.transferId');
  const protocol = session.getItem('report.protocol');
  let bytes = transferId ? await transferStore.take(transferId) : null;
  if (!bytes) {
    if (!protocol) throw new Error('Não há uma emissão disponível nesta aba.');
    bytes = await download(protocol);
  }
  const archive = openArchive(bytes);
  const metadata = parseMetadataList(archive.readText('visualizacao.json'));
  const index = Math.min(Math.max(visualizationIndex, 0), metadata.length - 1);
  const dashboard = resolveDashboard(metadata[index]);
  if (dashboard.id !== id || dashboard.version !== version) throw new Error('Este relatório pertence a outro dashboard.');
  onVisualizations?.({ count: metadata.length, index, select: next => startDashboard({ id, version, load, render, session, transferStore: { take: async () => bytes }, download, container, visualizationIndex: next, onVisualizations }) });
  const context = metadata.length > 1 ? { protocol, visualizationIndex: index, visualizationCount: metadata.length } : { protocol };
  return render(container, await load(archive, context));
}
