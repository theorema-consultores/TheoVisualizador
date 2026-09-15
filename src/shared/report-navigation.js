import { toggleTheme } from './theme.js';

function labelFor(item, all) {
  const label = item.label ?? item.id;
  return all.filter(other => (other.label ?? other.id) === label).length > 1 ? `${label} ${all.indexOf(item) + 1}` : label;
}

function menuLabel(item, all) {
  return labelFor(item, all).replace(/^Balancete\s+/i, '');
}

function iconFor(item) {
  const id = item.id.toLowerCase();
  if (id.includes('receita')) return 'bar_chart';
  if (id.includes('despesa')) return 'description';
  return 'dashboard';
}

export function renderReportNavigation(container, { visualizations, activeIndex, onSelect, municipality = '', storage, logoUrl = '' }) {
  const doc = container.ownerDocument;
  const sidebar = doc.createElement('aside');
  sidebar.className = 'app-sidebar';
  sidebar.setAttribute('aria-label', 'Navegação principal');
  sidebar.innerHTML = `<a class="brand" href="./?home=1" aria-label="Theorema Visualizador"><img src="${logoUrl}" alt="Theorema Consultores" /></a><p class="sidebar-eyebrow">Dashboards</p><nav class="sidebar-navigation" aria-label="Dashboards disponíveis"><div class="visualization-menu"></div></nav><div class="sidebar-footer"><span class="material-symbols-rounded" aria-hidden="true">account_balance</span><div><strong class="municipality-name"></strong><span>Gestão pública com transparência</span></div></div>`;
  sidebar.querySelector('.municipality-name').textContent = municipality || 'Município não informado';

  const nav = doc.createElement('header');
  nav.className = 'app-nav';
  nav.innerHTML = `<div class="breadcrumb"><span>Gestão fiscal</span><span aria-hidden="true">/</span><strong class="breadcrumb-current"></strong></div><div class="nav-actions"><button class="theme-toggle" type="button"></button><a class="support-link" href="https://theorema.movidesk.com/" target="_blank" rel="noreferrer">Solicitar suporte<span class="material-symbols-rounded" aria-hidden="true">open_in_new</span></a></div>`;

  const menu = sidebar.querySelector('.visualization-menu');
  const themeButton = nav.querySelector('.theme-toggle');
  const selectedIndex = Math.min(Math.max(activeIndex ?? 0, 0), Math.max(visualizations.length - 1, 0));
  nav.querySelector('.breadcrumb-current').textContent = visualizations.length ? menuLabel(visualizations[selectedIndex], visualizations) : 'Dashboard';

  const updateThemeButton = () => {
    const dark = doc.documentElement.dataset.theme === 'dark';
    themeButton.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${dark ? 'light_mode' : 'dark_mode'}</span>`;
    themeButton.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
  };
  updateThemeButton();
  themeButton.addEventListener('click', () => { toggleTheme({ document: doc, storage }); updateThemeButton(); });

  menu.setAttribute('role', 'tablist');
  menu.setAttribute('aria-label', 'Relatórios da visão');
  visualizations.forEach((item, index) => {
    const selected = index === selectedIndex;
    const button = doc.createElement('button');
    button.type = 'button';
    button.role = 'tab';
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.classList.toggle('is-active', selected);
    const icon = doc.createElement('span');
    icon.className = 'material-symbols-rounded';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = iconFor(item);
    button.append(icon, doc.createTextNode(menuLabel(item, visualizations)));
    button.addEventListener('click', () => onSelect(index));
    menu.append(button);
  });

  doc.body.classList.add('has-app-sidebar');
  container.before(sidebar);
  container.before(nav);
  return { destroy() { sidebar.remove(); nav.remove(); doc.body.classList.remove('has-app-sidebar'); } };
}
