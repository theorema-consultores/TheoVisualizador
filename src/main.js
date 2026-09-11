import './styles.css';
import { openArchive } from './core/archive.js';
import { downloadResult } from './core/download.js';
import { resolveReport } from './core/resolver.js';
import { createTransferStore } from './core/transfer-store.js';
import { resolveDashboard } from './core/dashboard-registry.js';
import { startDashboard } from './core/dashboard-runtime.js';
import { renderError, renderProtocolPrompt } from './shared/shell.js';
import { initializeTheme } from './shared/theme.js';

document.documentElement.classList.add('js');
initializeTheme({ document, storage: window.localStorage, prefersDark: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false });

const app = document.getElementById('app');
const transferStore = createTransferStore();
const mount = ({ dashboard, bytes }) => startDashboard({
  id: dashboard.id,
  version: dashboard.version,
  dashboard,
  bytes,
  load: dashboard.load,
  render: (container, model) => dashboard.mount(container, { model }),
  session: window.sessionStorage,
  transferStore,
  download: downloadResult,
  container: app
});
const queryProtocol = new URLSearchParams(window.location.search).get('protocolo');
const sessionDashboardId = window.sessionStorage.getItem('report.dashboardId');
const sessionDashboardVersion = window.sessionStorage.getItem('report.dashboardVersion');
if (!queryProtocol && (!sessionDashboardId || !sessionDashboardVersion)) {
  renderProtocolPrompt(app);
} else if (queryProtocol) {
  resolveReport({
    search: window.location.search,
    session: window.sessionStorage,
    download: downloadResult,
    openArchive,
    transferStore,
    navigate: url => window.history.replaceState({}, '', url)
  }).then(result => mount({ dashboard: result.dashboard, bytes: result.bytes })).catch(error => {
    renderError(app, error, { retry: () => window.location.reload() });
  });
} else {
  const dashboard = resolveDashboard({ dashboard: { id: sessionDashboardId, version: sessionDashboardVersion } });
  mount({ dashboard }).catch(error => {
    renderError(app, error, { retry: () => window.location.reload() });
  });
}
