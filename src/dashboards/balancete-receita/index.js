import './styles.css';
import { createTransferStore } from '../../core/transfer-store.js';
import { downloadResult } from '../../core/download.js';
import { startDashboard } from '../../core/dashboard-runtime.js';
import { loadBalancete } from './data.js';
import { renderBalancete } from './view.js';
import { renderError } from '../../shared/shell.js';
import logoUrl from '../../assets/theorema-logo.png';
import { initializeTheme, toggleTheme } from '../../shared/theme.js';
import { dashboardLabel } from '../../core/dashboard-registry.js';

const app = document.getElementById('app');
app.textContent = 'Carregando relatório…';
initializeTheme({ document, storage: window.localStorage, prefersDark: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false });
let selector;
const nav = document.createElement('header');
nav.className = 'app-nav';
nav.innerHTML = `<a class="brand" href="../../" aria-label="Theorema Visualizador"><img src="${logoUrl}" alt="Theorema Consultores" /></a><div class="visualization-menu" role="tablist" aria-label="Visualizações do relatório"></div><div class="nav-actions"><button class="theme-toggle" type="button" aria-label="Ativar tema escuro">☾</button><a class="support-link" href="https://theorema.movidesk.com/" target="_blank" rel="noreferrer">Solicitar suporte<span aria-hidden="true">↗</span></a></div>`;
app.before(nav);
selector = nav.querySelector('.visualization-menu');
const themeButton = nav.querySelector('.theme-toggle');
const updateThemeButton = theme => { themeButton.textContent = theme === 'dark' ? '☀' : '☾'; themeButton.setAttribute('aria-label', theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'); };
updateThemeButton(document.documentElement.dataset.theme);
themeButton.addEventListener('click', () => updateThemeButton(toggleTheme({ document, storage: window.localStorage })));
startDashboard({ id: 'balancete-receita', version: '1.0.0', load: loadBalancete, render: renderBalancete, transferStore: createTransferStore(), download: downloadResult, container: app,
  onVisualizations: ({ count, index, select, visualizations }) => {
    selector.replaceChildren();
    const labels = visualizations.map(item => item.label ?? dashboardLabel(item.id));
    const totals = labels.reduce((all, label) => ({ ...all, [label]: (all[label] ?? 0) + 1 }), {});
    const seen = {};
    for (let item = 0; item < count; item += 1) {
      const label = labels[item];
      seen[label] = (seen[label] ?? 0) + 1;
      const button = document.createElement('button'); button.type = 'button'; button.role = 'tab'; button.textContent = totals[label] > 1 ? `${label} ${seen[label]}` : label; button.setAttribute('aria-selected', String(item === index)); button.addEventListener('click', () => select(item)); selector.append(button);
    }
  }
})
  .catch(error => renderError(app, error, { retry: () => window.location.reload() }));
