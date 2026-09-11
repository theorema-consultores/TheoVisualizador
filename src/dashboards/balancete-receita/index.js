import './styles.css';
import { createTransferStore } from '../../core/transfer-store.js';
import { downloadResult } from '../../core/download.js';
import { startDashboard } from '../../core/dashboard-runtime.js';
import { loadBalancete } from './data.js';
import { renderBalancete } from './view.js';
import { renderError } from '../../shared/shell.js';
import logoUrl from '../../assets/theorema-logo.png';

const app = document.getElementById('app');
app.textContent = 'Carregando relatório…';
let selector;
const nav = document.createElement('header');
nav.className = 'app-nav';
nav.innerHTML = `<a class="brand" href="../../" aria-label="Theorema Visualizador"><img src="${logoUrl}" alt="Theorema Consultores" /></a><div class="visualization-menu" role="tablist" aria-label="Visualizações do relatório"></div><a class="support-link" href="https://theorema.movidesk.com/" target="_blank" rel="noreferrer">Solicitar suporte<span aria-hidden="true">↗</span></a>`;
app.before(nav);
selector = nav.querySelector('.visualization-menu');
startDashboard({ id: 'balancete-receita', version: '1.0.0', load: loadBalancete, render: renderBalancete, transferStore: createTransferStore(), download: downloadResult, container: app,
  onVisualizations: ({ count, index, select }) => {
    selector.replaceChildren();
    for (let item = 0; item < count; item += 1) {
      const button = document.createElement('button'); button.type = 'button'; button.role = 'tab'; button.textContent = `Visualização ${item + 1}`; button.setAttribute('aria-selected', String(item === index)); button.addEventListener('click', () => select(item)); selector.append(button);
    }
  }
})
  .catch(error => renderError(app, error, { retry: () => window.location.reload() }));
