import { parseMetadata } from './metadata.js';
import { resolveDashboard } from './dashboard-registry.js';
import { openArchive } from './archive.js';

export async function startDashboard({ id, version, load, render, session = sessionStorage, transferStore, download, container = document.getElementById('app') }) {
  const transferId = session.getItem('report.transferId');
  let bytes = transferId ? await transferStore.take(transferId) : null;
  if (!bytes) {
    const protocol = session.getItem('report.protocol');
    if (!protocol) throw new Error('Não há uma emissão disponível nesta aba.');
    bytes = await download(protocol);
  }
  const archive = openArchive(bytes);
  const metadata = parseMetadata(archive.readText('visualizacao.json'));
  const dashboard = resolveDashboard(metadata);
  if (dashboard.id !== id || dashboard.version !== version) throw new Error('Este relatório pertence a outro dashboard.');
  return render(container, await load(archive));
}
