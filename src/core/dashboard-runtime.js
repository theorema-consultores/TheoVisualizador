import { parseMetadataList } from './metadata.js';
import { resolveDashboard } from './dashboard-registry.js';
import { openArchive } from './archive.js';

export async function startDashboard({ id, version, dashboard, bytes: providedBytes, load, render, session = sessionStorage, transferStore, download, container = document.getElementById('app'), visualizationIndex = 0, onVisualizations }) {
  const transferId = session.getItem('report.transferId');
  const protocol = session.getItem('report.protocol');
  let bytes = providedBytes ?? (transferId ? await transferStore.take(transferId) : null);
  if (!bytes) {
    if (!protocol) throw new Error('Não há uma emissão disponível nesta aba.');
    bytes = await download(protocol);
  }
  const archive = openArchive(bytes);
  const metadata = parseMetadataList(archive.readText('visualizacao.json'));
  const index = Math.min(Math.max(visualizationIndex, 0), metadata.length - 1);
  const selectedDashboard = dashboard ?? resolveDashboard(metadata[index]);
  if ((selectedDashboard.id !== id || selectedDashboard.version !== version) && !dashboard) throw new Error('Este relatório pertence a outro dashboard.');
  onVisualizations?.({ count: metadata.length, index, select: next => startDashboard({ id: selectedDashboard.id, version: selectedDashboard.version, dashboard: selectedDashboard, load, render, bytes, session, transferStore: { take: async () => bytes }, download, container, visualizationIndex: next, onVisualizations }), visualizations: metadata.map(item => resolveDashboard(item)) });
  const context = metadata.length > 1 ? { protocol, visualizationIndex: index, visualizationCount: metadata.length } : { protocol };
  const loadContext = metadata[index].arquivo ? { ...context, dataFile: metadata[index].arquivo } : context;
  return render(container, await load(archive, loadContext));
}
