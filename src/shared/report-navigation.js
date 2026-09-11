import { toggleTheme } from './theme.js';

function labelFor(item, all) {
  const label = item.label ?? item.id;
  return all.filter(other => (other.label ?? other.id) === label).length > 1 ? `${label} ${all.indexOf(item) + 1}` : label;
}

export function renderReportNavigation(container, { visualizations, activeIndex, onSelect, storage, logoUrl = '' }) {
  const doc = container.ownerDocument;
  const nav = doc.createElement('header');
  nav.className = 'app-nav';
  nav.innerHTML = `<a class="brand" href="./" aria-label="Theorema Visualizador"><img src="${logoUrl}" alt="Theorema Consultores" /></a><div class="visualization-menu"></div><div class="nav-actions"><button class="theme-toggle" type="button"></button><a class="support-link" href="https://theorema.movidesk.com/" target="_blank" rel="noreferrer">Solicitar suporte<span aria-hidden="true">↗</span></a></div>`;
  const menu = nav.querySelector('.visualization-menu');
  const themeButton = nav.querySelector('.theme-toggle');
  const updateThemeButton = () => {
    const dark = doc.documentElement.dataset.theme === 'dark';
    themeButton.textContent = dark ? '☀' : '☾';
    themeButton.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
  };
  updateThemeButton();
  themeButton.addEventListener('click', () => { toggleTheme({ document: doc, storage }); updateThemeButton(); });
  if (visualizations.length <= 4) {
    menu.setAttribute('role', 'tablist'); menu.setAttribute('aria-label', 'Visualizações do relatório');
    visualizations.forEach((item, index) => {
      const button = doc.createElement('button'); button.type = 'button'; button.role = 'tab'; button.textContent = labelFor(item, visualizations); button.setAttribute('aria-selected', String(index === activeIndex)); button.addEventListener('click', () => onSelect(index)); menu.append(button);
    });
  } else {
    const label = doc.createElement('label'); label.htmlFor = 'visualizacao-select'; label.textContent = 'Visualização';
    const select = doc.createElement('select'); select.id = 'visualizacao-select'; select.name = 'visualizacao'; select.setAttribute('aria-label', 'Visualização do relatório');
    visualizations.forEach((item, index) => { const option = doc.createElement('option'); option.value = String(index); option.textContent = labelFor(item, visualizations); option.selected = index === activeIndex; select.append(option); });
    select.addEventListener('change', () => onSelect(Number(select.value)));
    menu.append(label, select);
  }
  container.before(nav);
  return { destroy() { nav.remove(); } };
}
