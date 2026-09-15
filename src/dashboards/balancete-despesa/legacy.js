import './styles.css';
import '../dashboard-shared.css';
import { createTransferStore } from '../../core/transfer-store.js';
import { downloadResult } from '../../core/download.js';
import { startDashboard } from '../../core/dashboard-runtime.js';
import { loadBalanceteDespesa } from './data.js';
import { mountBalanceteDespesa } from './index.js';
import { renderError } from '../../shared/shell.js';

const app = document.getElementById('app');
app.textContent = 'Carregando relatório…';
startDashboard({ id: 'balancete-despesa', version: '1.0.0', load: loadBalanceteDespesa, render: (container, model) => mountBalanceteDespesa(container, { model }), transferStore: createTransferStore(), download: downloadResult, container: app })
  .catch(error => renderError(app, error, { retry: () => window.location.reload() }));
