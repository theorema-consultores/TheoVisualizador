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
  const context = metadata.length > 1 ? { protocol, visualizationIndex: index, visualizationCount: metadata.length } : { protocol };
  const loadContext = metadata[index].arquivo ? { ...context, dataFile: metadata[index].arquivo } : context;
  const model = await load(archive, loadContext);
  onVisualizations?.({
    count: metadata.length,
    index,
    municipality: model.entityName,
    select: next => {
      const selectedIndex = Math.min(Math.max(next, 0), metadata.length - 1);
      const nextDashboard = resolveDashboard(metadata[selectedIndex]);
      return startDashboard({
        id: nextDashboard.id,
        version: nextDashboard.version,
        dashboard: nextDashboard,
        load: nextDashboard.load,
        render: (target, nextModel) => nextDashboard.mount(target, { model: nextModel }),
        bytes,
        session,
        transferStore: { take: async () => bytes },
        download,
        container,
        visualizationIndex: selectedIndex,
        onVisualizations
      });
    },
    visualizations: metadata.map(item => resolveDashboard(item))
  });
  return render(container, model);
}
