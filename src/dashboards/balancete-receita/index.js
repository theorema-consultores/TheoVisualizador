import './styles.css';
import { createTransferStore } from '../../core/transfer-store.js';
import { downloadResult } from '../../core/download.js';
import { startDashboard } from '../../core/dashboard-runtime.js';
import { loadBalancete } from './data.js';
import { renderBalancete } from './view.js';

const app = document.getElementById('app');
app.textContent = 'Carregando relatório…';
startDashboard({ id: 'balancete-receita', version: '1.0.0', load: loadBalancete, render: renderBalancete, transferStore: createTransferStore(), download: downloadResult, container: app })
  .catch(error => { app.textContent = error.message; });
