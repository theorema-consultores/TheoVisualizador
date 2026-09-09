import { GLOSSARY } from './glossary.js';
import { aggregate, formatVariation } from './data.js';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const TABS = [
  { key: 'receita', labelKey: 'descricao', label: 'Por Receita e Descrição' },
  { key: 'recurso', labelKey: 'recurso', label: 'Por Recurso' },
  { key: 'origem', labelKey: 'origem', label: 'Origem do Recurso', resource: true },
  { key: 'aplicacao', labelKey: 'aplicacao', label: 'Aplicação Fonte', resource: true },
  { key: 'desdobramento', labelKey: 'desdobramento', label: 'Desdobramento Fonte', resource: true },
  { key: 'detalhamento', labelKey: 'detalhamento', label: 'Detalhamento Fonte', resource: true }
];

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const signedPercent = value => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const element = (doc, tag, text = '', className = '') => {
  const node = doc.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
};

function appendKpi(doc, container, label, value, detail, muted = false) {
  const card = element(doc, 'article', '', 'kpi-card');
  card.append(
    element(doc, 'div', label, 'label'),
    element(doc, 'strong', value, `value${muted ? ' muted' : ''}`),
    element(doc, 'div', detail, 'subtext')
  );
  container.append(card);
}

function createExecutionPanel(doc, model) {
  const panel = element(doc, 'section', '', 'execution-panel');
  panel.setAttribute('aria-label', 'Dados da execução');
  const status = element(doc, 'div', '✓', 'execution-status');
  status.setAttribute('aria-hidden', 'true');
  const content = element(doc, 'div', '', 'execution-content');
  content.append(element(doc, 'strong', 'Dados carregados com sucesso', 'execution-title'));
  const grid = element(doc, 'dl', '', 'execution-grid');
  const fields = [
    ['Executado por', model.execution?.user ?? 'Não informado'],
    ['Protocolo', model.execution?.protocol ?? 'Não informado'],
    ...(model.execution?.issues ?? []).map(issue => [`Emissão ${issue.year}`, issue.dateTime])
  ];
  fields.forEach(([label, value]) => {
    const item = element(doc, 'div', '', 'execution-item');
    item.append(element(doc, 'dt', label), element(doc, 'dd', value));
    grid.append(item);
  });
  content.append(grid);
  panel.append(status, content);
  return panel;
}

function combineRows(model, tab) {
  const named = item => ({ ...item, label: GLOSSARY[tab.key]?.[item.code] ?? item.label });
  const previous = Object.fromEntries(aggregate(model.previous, tab.key, tab.labelKey).map(named).map(item => [item.code, item]));
  const current = Object.fromEntries(aggregate(model.current, tab.key, tab.labelKey).map(named).map(item => [item.code, item]));
  const empty = label => ({ total: 0, label, months: Array(12).fill(0), count: 0 });
  const currentGlobal = model.current.reduce((sum, record) => sum + record.total, 0);
  return [...new Set([...Object.keys(previous), ...Object.keys(current)])].map(code => {
    const before = previous[code] ?? empty(current[code]?.label ?? code);
    const now = current[code] ?? empty(previous[code]?.label ?? code);
    return {
      code,
      label: now.label || before.label,
      previous: before,
      current: now,
      variation: now.total - before.total,
      variationPercent: before.total === 0 ? null : (now.total - before.total) / Math.abs(before.total) * 100,
      participation: currentGlobal === 0 ? 0 : now.total / currentGlobal * 100
    };
  });
}

function renderMonthDetails(doc, target, row, model) {
  if (target.childElementCount) return;
  const header = element(doc, 'div', '', 'details-header');
  header.append(
    element(doc, 'div', `${row.code} - ${row.label}`, 'details-title'),
    element(doc, 'div', `Lançamentos: ${model.previousYear} (${row.previous.count}) · ${model.currentYear} (${row.current.count}) · Participação ${model.currentYear}: ${row.participation.toFixed(2)}%`, 'details-sub')
  );
  const grid = element(doc, 'div', '', 'cards-month-grid');
  MONTHS.forEach((month, index) => {
    const previous = row.previous.months[index];
    const current = row.current.months[index];
    const variation = previous === 0 ? (current > 0 ? 100 : 0) : (current - previous) / Math.abs(previous) * 100;
    const maximum = Math.max(Math.abs(previous), Math.abs(current)) || 1;
    const card = element(doc, 'article', '', 'month-card');
    card.append(
      element(doc, 'div', month, 'm-title'),
      element(doc, 'div', `${String(model.previousYear).slice(-2)}  ${money(previous)}`, 'm-line'),
      element(doc, 'div', `${String(model.currentYear).slice(-2)}  ${money(current)}`, 'm-line'),
      element(doc, 'div', signedPercent(variation), `m-var ${variation < 0 ? 'negative' : variation > 0 ? 'positive' : ''}`)
    );
    const bars = element(doc, 'div', '', 'month-bars');
    const beforeBar = element(doc, 'span', '', 'month-bar previous');
    const currentBar = element(doc, 'span', '', 'month-bar current');
    beforeBar.style.height = `${Math.max(4, Math.abs(previous) / maximum * 100)}%`;
    currentBar.style.height = `${Math.max(4, Math.abs(current) / maximum * 100)}%`;
    bars.append(beforeBar, currentBar);
    card.append(bars);
    grid.append(card);
  });
  target.append(header, grid);
}

function sortRows(rows, column, direction) {
  const value = row => {
    if (column === 'code' || column === 'label') return row[column];
    if (column === 'previous') return row.previous.total;
    if (column === 'variation') return row.variation;
    if (column === 'variationPercent') return row.variationPercent ?? -Infinity;
    return row.current.total;
  };
  return [...rows].sort((leftRow, rightRow) => {
    const left = value(leftRow);
    const right = value(rightRow);
    return typeof left === 'string' ? direction * left.localeCompare(right, 'pt-BR') : direction * (left - right);
  });
}

export function renderBalancete(container, model) {
  const doc = container.ownerDocument;
  container.replaceChildren();
  const root = element(doc, 'section', '', 'balancete');
  const hero = element(doc, 'header', '', 'hero');
  hero.append(
    element(doc, 'p', 'GESTÃO FISCAL · VISÃO COMPARATIVA', 'eyebrow'),
    element(doc, 'h1', 'Dashboard Comparativo de Balancete da Receita'),
    element(doc, 'p', `${model.entityName} · comparativo mensal e anual entre ${model.previousYear} e ${model.currentYear}`, 'hero-detail')
  );
  root.append(hero, createExecutionPanel(doc, model));

  const currentTotal = model.current.reduce((sum, record) => sum + record.total, 0);
  const previousTotal = model.previous.reduce((sum, record) => sum + record.total, 0);
  const kpis = element(doc, 'section', '', 'kpi-grid');
  appendKpi(doc, kpis, `Exercício Atual (${model.currentYear})`, money(currentTotal), 'Acumulado anual');
  appendKpi(doc, kpis, `Exercício Anterior (${model.previousYear})`, money(previousTotal), 'Acumulado anual', true);
  appendKpi(doc, kpis, 'Variação Anual', formatVariation(currentTotal, previousTotal), money(currentTotal - previousTotal));

  const monthCard = element(doc, 'article', '', 'kpi-card');
  const monthHeader = element(doc, 'div', '', 'label month-heading');
  monthHeader.append(element(doc, 'span', 'Mês de referência'));
  const monthSelect = doc.createElement('select');
  monthSelect.className = 'month-select';
  monthSelect.setAttribute('aria-label', 'Mês de referência');
  MONTHS.forEach((month, index) => {
    const option = element(doc, 'option', month);
    option.value = String(index);
    option.selected = index === new Date().getMonth();
    monthSelect.append(option);
  });
  monthHeader.append(monthSelect);
  const monthValue = element(doc, 'strong', '', 'value');
  const monthDetail = element(doc, 'div', '', 'subtext');
  const updateMonth = () => {
    const index = Number(monthSelect.value);
    const current = model.current.reduce((sum, record) => sum + record.months[index], 0);
    const previous = model.previous.reduce((sum, record) => sum + record.months[index], 0);
    monthValue.textContent = money(current);
    monthDetail.textContent = `Mesmo mês em ${model.previousYear}: ${money(previous)}`;
  };
  monthSelect.addEventListener('change', updateMonth);
  updateMonth();
  monthCard.append(monthHeader, monthValue, monthDetail);
  kpis.append(monthCard);
  root.append(kpis);

  const tabs = element(doc, 'nav', '', 'tabs-header');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Visões do balancete');
  const content = element(doc, 'div', '', 'tab-contents');
  let activeTab = TABS[0];
  let sortColumn = 'current';
  let sortDirection = -1;

  const draw = () => {
    content.replaceChildren();
    const panel = element(doc, 'section', '', `tab-content${activeTab.resource ? ' resource-theme' : ''}`);
    if (activeTab.resource) panel.append(element(doc, 'p', 'Agrupamento derivado da decomposição da máscara do código do recurso.', 'legend-box'));
    const filter = doc.createElement('input');
    filter.type = 'search';
    filter.className = 'search-input';
    filter.placeholder = 'Filtrar por código ou descrição…';
    filter.setAttribute('aria-label', 'Filtrar tabela');
    panel.append(filter);

    const rows = combineRows(model, activeTab);
    const ranking = element(doc, 'section', '', 'ranking-section');
    ranking.append(element(doc, 'h2', 'Top 8 · Exercício Atual', 'ranking-title'));
    const top = [...rows].sort((a, b) => b.current.total - a.current.total).slice(0, 8);
    const maximum = Math.max(...top.map(row => Math.max(0, row.current.total)), 1);
    top.forEach(row => {
      const barRow = element(doc, 'div', '', 'bar-row');
      const label = element(doc, 'div', `${row.code} · ${row.label}`, 'bar-label');
      label.title = `${row.code} - ${row.label}`;
      const track = element(doc, 'div', '', 'bar-track');
      const fill = element(doc, 'div', '', 'bar-fill');
      fill.style.width = `${Math.max(0, row.current.total) / maximum * 100}%`;
      track.append(fill);
      barRow.append(label, track, element(doc, 'div', money(row.current.total), 'bar-value'));
      ranking.append(barRow);
    });
    panel.append(ranking);

    const wrapper = element(doc, 'div', '', 'table-container');
    const table = doc.createElement('table');
    const head = doc.createElement('thead');
    const header = doc.createElement('tr');
    const columns = [
      ['code', 'Código'], ['label', 'Descrição / Agrupamento'], ['previous', `Ex. Anterior (${model.previousYear})`],
      ['current', `Ex. Atual (${model.currentYear})`], ['variation', 'Variação (R$)'], ['variationPercent', 'Variação (%)']
    ];
    columns.forEach(([column, label]) => {
      const th = doc.createElement('th');
      if (!['code', 'label'].includes(column)) th.className = 'numeric';
      const button = element(doc, 'button', label);
      button.type = 'button';
      button.dataset.sort = sortColumn === column ? sortDirection === 1 ? 'asc' : 'desc' : 'none';
      button.addEventListener('click', () => {
        sortDirection = sortColumn === column ? -sortDirection : 1;
        sortColumn = column;
        draw();
      });
      th.append(button);
      header.append(th);
    });
    head.append(header);
    table.append(head);
    const body = doc.createElement('tbody');
    sortRows(rows, sortColumn, sortDirection).forEach(row => {
      const mainRow = element(doc, 'tr', '', 'main-row');
      mainRow.tabIndex = 0;
      const variationText = row.variationPercent === null ? '—' : signedPercent(row.variationPercent);
      [row.code, row.label, money(row.previous.total), money(row.current.total), money(row.variation), variationText].forEach((value, index) => {
        const direction = row.variation < 0 ? 'negative' : 'positive';
        mainRow.append(element(doc, 'td', value, index >= 2 ? `numeric${index >= 4 ? ` ${direction}` : ''}` : ''));
      });
      const detailRow = element(doc, 'tr', '', 'details-row');
      detailRow.hidden = true;
      const detailCell = doc.createElement('td');
      detailCell.colSpan = 6;
      const details = doc.createElement('details');
      const summary = element(doc, 'summary', `Detalhamento mensal de ${row.code}`);
      const detailContent = element(doc, 'div', '', 'details-container');
      details.append(summary, detailContent);
      detailCell.append(details);
      detailRow.append(detailCell);
      const toggle = () => {
        detailRow.hidden = !detailRow.hidden;
        details.open = !detailRow.hidden;
        if (!detailRow.hidden) renderMonthDetails(doc, detailContent, row, model);
      };
      mainRow.addEventListener('click', toggle);
      mainRow.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
      body.append(mainRow, detailRow);
    });
    filter.addEventListener('input', () => {
      const term = filter.value.toLocaleLowerCase('pt-BR');
      [...body.querySelectorAll('.main-row')].forEach(mainRow => {
        const detailRow = mainRow.nextElementSibling;
        const visible = mainRow.textContent.toLocaleLowerCase('pt-BR').includes(term);
        mainRow.hidden = !visible;
        if (!visible) detailRow.hidden = true;
      });
    });
    table.append(body);
    wrapper.append(table);
    panel.append(wrapper);
    content.append(panel);
  };

  TABS.forEach((tab, index) => {
    const button = element(doc, 'button', tab.label, `tab-button${tab.resource ? ' resource-tab' : ''}`);
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(index === 0));
    button.addEventListener('click', () => {
      activeTab = tab;
      [...tabs.children].forEach(item => item.setAttribute('aria-selected', 'false'));
      button.setAttribute('aria-selected', 'true');
      draw();
    });
    tabs.append(button);
  });
  root.append(tabs, content);
  container.append(root);
  draw();
  return { destroy() { root.remove(); } };
}
