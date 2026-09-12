import { toggleTheme } from './theme.js';

function labelFor(item, all) {
  const label = item.label ?? item.id;
  return all.filter(other => (other.label ?? other.id) === label).length > 1 ? `${label} ${all.indexOf(item) + 1}` : label;
}

export function renderReportNavigation(container, { visualizations, activeIndex, onSelect, storage, logoUrl = '' }) {
  const doc = container.ownerDocument;
  const nav = doc.createElement('header');
  nav.className = 'app-nav';
  nav.innerHTML = `<a class="brand" href="./?home=1" aria-label="Theorema Visualizador"><img src="${logoUrl}" alt="Theorema Consultores" /></a><div class="visualization-menu"></div><div class="nav-actions"><button class="theme-toggle" type="button"></button><a class="support-link" href="https://theorema.movidesk.com/" target="_blank" rel="noreferrer">Solicitar suporte<span class="material-symbols-rounded" aria-hidden="true">open_in_new</span></a></div>`;
  const menu = nav.querySelector('.visualization-menu');
  const themeButton = nav.querySelector('.theme-toggle');
  const updateThemeButton = () => {
    const dark = doc.documentElement.dataset.theme === 'dark';
    themeButton.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${dark ? 'light_mode' : 'dark_mode'}</span>`;
    themeButton.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
  };
  updateThemeButton();
  themeButton.addEventListener('click', () => { toggleTheme({ document: doc, storage }); updateThemeButton(); });
  menu.setAttribute('role', 'tablist'); menu.setAttribute('aria-label', 'Relatórios da visão');
  visualizations.forEach((item, index) => {
    const button = doc.createElement('button');
    button.type = 'button'; button.role = 'tab'; button.textContent = labelFor(item, visualizations);
    button.setAttribute('aria-selected', String(index === activeIndex));
    button.tabIndex = index === activeIndex ? 0 : -1;
    button.addEventListener('click', () => onSelect(index));
    menu.append(button);
  });
  container.before(nav);
  return { destroy() { nav.remove(); } };
}
