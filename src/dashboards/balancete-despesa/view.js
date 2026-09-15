import { aggregate, formatVariation } from './data.js';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const PERIODS = [
  ['all', 'Total disponível no arquivo'],
  ['ytd', 'Acumulado até o mês'],
  ['month', 'Somente o mês']
];
const TABS = [
  { key: 'nature', label: 'Por Natureza e Descrição' },
  { key: 'resource', label: 'Por Recurso' },
  { key: 'organogram', label: 'Por Organograma' },
  { key: 'function', label: 'Por Função' },
  { key: 'category', label: 'Por Categoria Econômica' },
  { key: 'group', label: 'Por Grupo de Natureza' }
];
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const percent = value => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const element = (doc, tag, text = '', className = '') => {
  const node = doc.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
};
const field = (record, name, legacyName = name) => record[name] ?? record[legacyName] ?? '';
const natureOf = record => field(record, 'nature', 'natureza');
const descriptionOf = record => field(record, 'description', 'descricao');
const organogramOf = record => field(record, 'organogram');
const organogramDescriptionOf = record => field(record, 'organogramDescription', 'descricaoOrganograma');
const functionOf = record => field(record, 'functionCode', 'funcao');
const functionDescriptionOf = record => field(record, 'functionDescription', 'descricaoFuncao');
const resourceOf = record => field(record, 'resource');
const resourceDescriptionOf = record => field(record, 'resourceDescription', 'descricaoRecurso');

function lastMonth(records) {
  return Math.max(0, ...records.flatMap(record => record.months.map((value, index) => value !== 0 ? index : 0)));
}

function periodAmount(values, period, month) {
  if (period === 'month') return values[month];
  if (period === 'ytd') return values.slice(0, month + 1).reduce((total, value) => total + value, 0);
  return values.reduce((total, value) => total + value, 0);
}

function filteredRecords(model, state, year) {
  const query = normalize(state.search.trim());
  return model[year].filter(record => {
    if (state.organogram && organogramOf(record) !== state.organogram) return false;
    if (state.functionCode && functionOf(record) !== state.functionCode) return false;
    if (state.resource && resourceOf(record) !== state.resource) return false;
    if (!query) return true;
    return normalize([
      natureOf(record), descriptionOf(record), organogramOf(record), organogramDescriptionOf(record),
      functionOf(record), functionDescriptionOf(record), resourceOf(record), resourceDescriptionOf(record)
    ].join(' ')).includes(query);
  });
}

function groupValue(tab, record) {
  if (tab.key === 'nature') return [natureOf(record), descriptionOf(record)];
  if (tab.key === 'resource') return [resourceOf(record), resourceDescriptionOf(record)];
  if (tab.key === 'organogram') return [organogramOf(record), organogramDescriptionOf(record)];
  if (tab.key === 'function') return [functionOf(record), functionDescriptionOf(record)];
  if (tab.key === 'category') {
    const code = natureOf(record).split('.')[0];
    return [code, code === '3' ? 'Despesas correntes' : code === '4' ? 'Despesas de capital' : `Categoria ${code}`];
  }
  const code = natureOf(record).split('.').slice(0, 2).join('.');
  return [code, `Grupo ${code}`];
}

function groupKey(item) {
  return `${item.code}\u0000${item.label}`;
}

function makeRows(model, state, tab) {
  const previous = aggregate(filteredRecords(model, state, 'previous'), record => groupValue(tab, record));
  const current = aggregate(filteredRecords(model, state, 'current'), record => groupValue(tab, record));
  const previousMap = new Map(previous.map(item => [groupKey(item), item]));
  const currentMap = new Map(current.map(item => [groupKey(item), item]));
  const currentGlobal = filteredRecords(model, state, 'current').reduce(
    (total, record) => total + periodAmount(record.months, state.period, state.month), 0
  );
  return [...new Set([...previousMap.keys(), ...currentMap.keys()])].map(key => {
    const before = previousMap.get(key) ?? { total: 0, months: Array(12).fill(0), count: 0 };
    const now = currentMap.get(key) ?? { total: 0, months: Array(12).fill(0), count: 0 };
    const amountBefore = periodAmount(before.months, state.period, state.month);
    const amountNow = periodAmount(now.months, state.period, state.month);
    return {
      code: currentMap.get(key)?.code ?? previousMap.get(key).code,
      label: currentMap.get(key)?.label ?? previousMap.get(key).label,
      previous: before,
      current: now,
      previousAmount: amountBefore,
      currentAmount: amountNow,
      variation: amountNow - amountBefore,
      variationPercent: formatVariation(amountNow, amountBefore),
      participation: currentGlobal === 0 ? 0 : amountNow / currentGlobal * 100
    };
  });
}

function sortRows(rows, column, direction) {
  const value = row => {
    if (column === 'code' || column === 'label') return row[column];
    if (column === 'previous') return row.previousAmount;
    if (column === 'variation') return row.variation;
    if (column === 'variationPercent') return row.variationPercent ?? -Infinity;
    return row.currentAmount;
  };
  return [...rows].sort((leftRow, rightRow) => {
    const left = value(leftRow);
    const right = value(rightRow);
    return typeof left === 'string'
      ? direction * left.localeCompare(right, 'pt-BR')
      : direction * (left - right);
  });
}

function createExecutionPanel(doc, model) {
  const panel = element(doc, 'section', '', 'execution-panel');
  panel.setAttribute('aria-label', 'Dados da execução');
  const status = element(doc, 'div', '✓', 'execution-status');
  status.setAttribute('aria-hidden', 'true');
  const content = element(doc, 'div', '', 'execution-content');
  content.append(element(doc, 'strong', 'Dados carregados com sucesso', 'execution-title'));
  const grid = element(doc, 'dl', '', 'execution-grid');
  [
    ['Executado por', model.execution?.user ?? 'Não informado'],
    ['Protocolo', model.execution?.protocol ?? 'Não informado'],
    ...(model.execution?.issues ?? []).map(issue => [`Emissão ${issue.year}`, issue.dateTime])
  ].forEach(([label, value]) => {
    const item = element(doc, 'div', '', 'execution-item');
    item.append(element(doc, 'dt', label), element(doc, 'dd', value));
    grid.append(item);
  });
  content.append(grid);
  panel.append(status, content);
  return panel;
}

function createDropdown(doc, { label, options, value, onChange }) {
  const wrapper = element(doc, 'label', '', 'filter-control');
  const labelNode = element(doc, 'span', label, 'filter-label');
  const dropdown = element(doc, 'div', '', 'dropdown filter-dropdown');
  const toggle = element(doc, 'button', '', 'dropdown-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-haspopup', 'listbox');
  toggle.setAttribute('aria-expanded', 'false');
  const selected = element(doc, 'span', '', 'dropdown-label');
  const icon = element(doc, 'span', 'expand_more', 'material-symbols-rounded dropdown-icon');
  toggle.append(selected, icon);
  const menu = element(doc, 'div', '', 'dropdown-menu');
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;

  const control = {
    value,
    wrapper,
    setValue(next, notify = true) {
      control.value = next;
      const selectedOption = options.find(option => option[0] === next) ?? options[0];
      selected.textContent = selectedOption[1];
      [...menu.children].forEach(option => option.setAttribute('aria-selected', String(option.dataset.value === String(next))));
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      if (notify) onChange(next);
    }
  };
  options.forEach(([optionValue, optionLabel]) => {
    const option = element(doc, 'button', optionLabel, 'dropdown-item');
    option.type = 'button';
    option.dataset.value = optionValue;
    option.setAttribute('role', 'option');
    option.addEventListener('click', () => control.setValue(optionValue));
    menu.append(option);
  });
  toggle.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  });
  toggle.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  dropdown.append(toggle, menu);
  wrapper.append(labelNode, dropdown);
  control.setValue(value, false);
  return control;
}

function appendKpi(doc, container, label, muted = false) {
  const card = element(doc, 'article', '', 'kpi-card');
  const value = element(doc, 'strong', '', `value${muted ? ' muted' : ''}`);
  const detail = element(doc, 'div', '', 'subtext');
  card.append(element(doc, 'div', label, 'label'), value, detail);
  container.append(card);
  return { value, detail };
}

function createMonthChart(doc, model, state, records, monthControl) {
  const panel = element(doc, 'section', '', 'chart-panel');
  panel.append(element(doc, 'h2', 'Comparativo mensal'), element(doc, 'p', 'Clique em uma barra para selecionar o mês.', 'chart-note'));
  const totals = {
    previous: Array(12).fill(0),
    current: Array(12).fill(0)
  };
  records.previous.forEach(record => record.months.forEach((value, index) => { totals.previous[index] += value; }));
  records.current.forEach(record => record.months.forEach((value, index) => { totals.current[index] += value; }));
  const maximum = Math.max(...totals.previous, ...totals.current, 1);
  const chart = element(doc, 'div', '', 'months-chart');
  MONTHS.forEach((month, index) => {
    const column = element(doc, 'div', '', 'month-column');
    const bars = element(doc, 'div', '', 'month-bars');
    [['previous', totals.previous[index], model.previousYear], ['current', totals.current[index], model.currentYear]].forEach(([kind, total, year]) => {
      const bar = element(doc, 'button', '', `month-bar ${kind}${state.month === index ? ' selected' : ''}`);
      bar.type = 'button';
      bar.style.height = `${Math.max(3, Math.abs(total) / maximum * 185)}px`;
      bar.setAttribute('aria-label', `${month} de ${year}: ${money(total)}`);
      bar.title = `${month} de ${year}: ${money(total)}`;
      bar.addEventListener('click', () => monthControl.setValue(String(index)));
      bars.append(bar);
    });
    column.append(bars, element(doc, 'small', month.slice(0, 3), `month-label${state.month === index ? ' selected' : ''}`));
    chart.append(column);
  });
  panel.append(chart);
  return panel;
}

function renderMonthDetails(doc, target, row, model) {
  if (target.childElementCount) return;
  const header = element(doc, 'div', '', 'details-header');
  header.append(
    element(doc, 'div', `${row.code} · ${row.label}`, 'details-title'),
    element(doc, 'div', `Lançamentos: ${model.previousYear} (${row.previous.count}) · ${model.currentYear} (${row.current.count}) · Participação ${model.currentYear}: ${row.participation.toFixed(2)}%`, 'details-sub')
  );
  const grid = element(doc, 'div', '', 'cards-month-grid');
  MONTHS.forEach((month, index) => {
    const previous = row.previous.months[index];
    const current = row.current.months[index];
    const variation = formatVariation(current, previous);
    const maximum = Math.max(Math.abs(previous), Math.abs(current), 1);
    const card = element(doc, 'article', '', 'month-card');
    card.append(
      element(doc, 'div', month, 'm-title'),
      element(doc, 'div', `${String(model.previousYear).slice(-2)}  ${money(previous)}`, 'm-line'),
      element(doc, 'div', `${String(model.currentYear).slice(-2)}  ${money(current)}`, 'm-line'),
      element(doc, 'div', variation === null ? '—' : percent(variation), `m-var ${variation < 0 ? 'negative' : variation > 0 ? 'positive' : ''}`)
    );
    const bars = element(doc, 'div', '', 'month-bars-detail');
    const previousBar = element(doc, 'span', '', 'month-bar previous');
    const currentBar = element(doc, 'span', '', 'month-bar current');
    previousBar.style.height = `${Math.max(4, Math.abs(previous) / maximum * 100)}%`;
    currentBar.style.height = `${Math.max(4, Math.abs(current) / maximum * 100)}%`;
    bars.append(previousBar, currentBar);
    card.append(bars);
    grid.append(card);
  });
  target.append(header, grid);
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`;
}

function downloadCsv(doc, rows, model, state, tab) {
  const lines = [
    ['Código', 'Descrição', `${model.previousYear} (período selecionado)`, `${model.currentYear} (período selecionado)`, 'Variação R$', 'Variação %'],
    ...rows.map(row => [row.code, row.label, row.previousAmount.toFixed(2), row.currentAmount.toFixed(2), row.variation.toFixed(2), row.variationPercent === null ? '' : row.variationPercent.toFixed(2)])
  ];
  const blob = new Blob([`\ufeff${lines.map(line => line.map(csvValue).join(';')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = `balancete-despesa-${tab.key}-${state.period}-mes${state.month + 1}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function renderBalanceteDespesa(container, model) {
  const doc = container.ownerDocument;
  container.replaceChildren();
  const state = {
    month: lastMonth(model.current), period: 'all', organogram: '', functionCode: '', resource: '', search: '', activeTab: 0,
    sortColumn: 'current', sortDirection: -1, page: 0
  };
  const root = element(doc, 'section', '', 'despesa-dashboard');
  const hero = element(doc, 'header', '', 'hero');
  hero.append(
    element(doc, 'p', 'GESTÃO FISCAL · EXECUÇÃO DA DESPESA', 'eyebrow'),
    element(doc, 'h1', 'Dashboard Comparativo de Balancete da Despesa'),
    element(doc, 'p', `${model.entityName} · comparativo das despesas pagas em ${model.previousYear} e ${model.currentYear}`, 'hero-detail')
  );
  const source = element(doc, 'section', '', 'source-panel');
  source.append(
    element(doc, 'strong', 'Dados carregados e totais conferidos'),
    element(doc, 'p', `${(model.previous.length + model.current.length).toLocaleString('pt-BR')} registros analíticos · despesas pagas em reais`, 'subtext')
  );
  const kpis = element(doc, 'section', '', 'kpi-grid');
  const currentKpi = appendKpi(doc, kpis, `Exercício atual (${model.currentYear})`);
  const previousKpi = appendKpi(doc, kpis, `Exercício anterior (${model.previousYear})`, true);
  const variationKpi = appendKpi(doc, kpis, 'Variação entre exercícios');
  const monthKpi = appendKpi(doc, kpis, 'Mês de referência');

  const filters = element(doc, 'section', '', 'filters');
  const refresh = () => { updateSummary(); draw(); };
  const monthControl = createDropdown(doc, { label: 'Mês de referência', options: MONTHS.map((month, index) => [String(index), month]), value: String(state.month), onChange: value => { state.month = Number(value); state.page = 0; refresh(); } });
  const periodControl = createDropdown(doc, { label: 'Período de comparação', options: PERIODS, value: state.period, onChange: value => { state.period = value; state.page = 0; refresh(); } });
  const organogramControl = createDropdown(doc, { label: 'Organograma nível 2', options: [['', 'Todos'], ...[...new Set(model.previous.concat(model.current).map(record => record.organogram))].sort().map(value => [value, value])], value: state.organogram, onChange: value => { state.organogram = value; state.page = 0; refresh(); } });
  const functionControl = createDropdown(doc, { label: 'Função (código)', options: [['', 'Todos'], ...[...new Set(model.previous.concat(model.current).map(record => record.functionCode))].sort().map(value => [value, value])], value: state.functionCode, onChange: value => { state.functionCode = value; state.page = 0; refresh(); } });
  const resourceOptions = [...new Map(model.previous.concat(model.current).map(record => [record.resource, record.resourceDescription])).entries()].sort((left, right) => left[0].localeCompare(right[0], 'pt-BR'));
  const resourceControl = createDropdown(doc, { label: 'Recurso (executado)', options: [['', 'Todos'], ...resourceOptions.map(([value, label]) => [value, `${value} · ${label}`])], value: state.resource, onChange: value => { state.resource = value; state.page = 0; refresh(); } });
  const reset = element(doc, 'button', 'Limpar filtros', 'secondary-action');
  reset.type = 'button';
  const filterControls = [monthControl, periodControl, organogramControl, functionControl, resourceControl];
  filters.append(...filterControls.map(control => control.wrapper), reset);
  root.append(hero, source, kpis, filters);

  const tabs = element(doc, 'nav', '', 'tabs-header');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Visões do balancete da despesa');
  TABS.forEach((tab, index) => {
    const button = element(doc, 'button', tab.label, 'tab-button');
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(index === state.activeTab));
    button.addEventListener('click', () => { state.activeTab = index; [...tabs.children].forEach(item => item.setAttribute('aria-selected', 'false')); button.setAttribute('aria-selected', 'true'); draw(); });
    tabs.append(button);
  });
  root.append(tabs);
  const content = element(doc, 'div', '', 'tab-contents');
  root.append(content);
  const note = element(doc, 'p', `Valores em reais. ${model.currentYear} pode possuir período parcial; meses sem movimento permanecem zerados no arquivo.`, 'note');
  root.append(note);
  container.append(root);

  function updateSummary() {
    const previous = filteredRecords(model, state, 'previous');
    const current = filteredRecords(model, state, 'current');
    const previousTotal = previous.reduce((total, record) => total + periodAmount(record.months, state.period, state.month), 0);
    const currentTotal = current.reduce((total, record) => total + periodAmount(record.months, state.period, state.month), 0);
    currentKpi.value.textContent = money(currentTotal);
    previousKpi.value.textContent = money(previousTotal);
    const rate = formatVariation(currentTotal, previousTotal);
    variationKpi.value.textContent = rate === null ? '—' : percent(rate);
    variationKpi.detail.textContent = `${money(currentTotal - previousTotal)}${previousTotal === 0 ? ' · base zero' : ''}`;
    monthKpi.value.textContent = money(current.reduce((total, record) => total + record.months[state.month], 0));
    monthKpi.detail.textContent = `Mesmo mês em ${model.previousYear}: ${money(previous.reduce((total, record) => total + record.months[state.month], 0))}`;
    currentKpi.detail.textContent = state.period === 'month' ? MONTHS[state.month] : state.period === 'ytd' ? `Janeiro a ${MONTHS[state.month].toLowerCase()}` : 'Acumulado no arquivo';
    previousKpi.detail.textContent = currentKpi.detail.textContent;
  }

  function draw() {
    const tab = TABS[state.activeTab];
    const previous = filteredRecords(model, state, 'previous');
    const current = filteredRecords(model, state, 'current');
    const rows = makeRows(model, state, tab);
    content.replaceChildren();
    const panel = element(doc, 'section', '', 'tab-content');
    const toolbar = element(doc, 'div', '', 'toolbar');
    const search = doc.createElement('input');
    search.type = 'search'; search.className = 'search-input'; search.placeholder = 'Filtrar por código ou descrição…'; search.setAttribute('aria-label', 'Filtrar tabela'); search.value = state.search;
    const exportButton = element(doc, 'button', 'Exportar CSV', 'secondary-action'); exportButton.type = 'button'; exportButton.addEventListener('click', () => downloadCsv(doc, sortRows(rows, state.sortColumn, state.sortDirection), model, state, tab));
    const printButton = element(doc, 'button', 'Imprimir', 'secondary-action'); printButton.type = 'button'; printButton.addEventListener('click', () => doc.defaultView?.print?.());
    toolbar.append(search, exportButton, printButton);
    panel.append(toolbar);
    const charts = element(doc, 'div', '', 'charts');
    const rankingPanel = element(doc, 'section', '', 'chart-panel');
    rankingPanel.append(element(doc, 'h2', `Top 8 · Exercício atual (${model.currentYear})`));
    const ranking = [...rows].sort((left, right) => right.currentAmount - left.currentAmount).slice(0, 8);
    const maximum = Math.max(...ranking.map(row => Math.abs(row.currentAmount)), 1);
    ranking.forEach(row => {
      const line = element(doc, 'div', '', 'rank bar-row');
      const header = element(doc, 'div', '', 'rankline');
      header.append(element(doc, 'span', `${row.code} · ${row.label}`), element(doc, 'strong', money(row.currentAmount)));
      const track = element(doc, 'div', '', 'track');
      const fill = element(doc, 'div', '', 'fill'); fill.style.width = `${Math.abs(row.currentAmount) / maximum * 100}%`; track.append(fill);
      line.append(header, track); rankingPanel.append(line);
    });
    if (!ranking.length) rankingPanel.append(element(doc, 'p', 'Nenhum registro encontrado.', 'subtext'));
    charts.append(rankingPanel, createMonthChart(doc, model, state, { previous, current }, monthControl));
    panel.append(charts);

    const tableWrapper = element(doc, 'div', '', 'tablewrap');
    const table = doc.createElement('table');
    const head = doc.createElement('thead');
    const header = doc.createElement('tr');
    const columns = [['code', 'Código'], ['label', 'Descrição / Agrupamento'], ['previous', `Ex. Anterior (${model.previousYear})`], ['current', `Ex. Atual (${model.currentYear})`], ['variation', 'Variação (R$)'], ['variationPercent', 'Variação (%)']];
    columns.forEach(([column, label]) => {
      const cell = doc.createElement('th');
      cell.setAttribute('aria-sort', state.sortColumn === column ? state.sortDirection === 1 ? 'ascending' : 'descending' : 'none');
      const button = element(doc, 'button', label, 'table-sort'); button.type = 'button'; button.addEventListener('click', () => { state.sortDirection = state.sortColumn === column ? -state.sortDirection : column === 'code' || column === 'label' ? 1 : -1; state.sortColumn = column; draw(); });
      cell.append(button); header.append(cell);
    });
    head.append(header); table.append(head);
    const body = doc.createElement('tbody');
    const sortedRows = sortRows(rows, state.sortColumn, state.sortDirection);
    const pageCount = Math.max(1, Math.ceil(sortedRows.length / 40));
    state.page = Math.min(state.page, pageCount - 1);
    sortedRows.slice(state.page * 40, state.page * 40 + 40).forEach(row => {
      const mainRow = element(doc, 'tr', '', 'main-row'); mainRow.tabIndex = 0;
      const detailRow = element(doc, 'tr', '', 'details-row'); detailRow.hidden = true;
      const detailCell = doc.createElement('td'); detailCell.colSpan = 6;
      const details = doc.createElement('details'); const summary = element(doc, 'summary', `Detalhamento mensal de ${row.code}`); const detailContent = element(doc, 'div', '', 'details-container'); details.append(summary, detailContent); detailCell.append(details); detailRow.append(detailCell);
      const toggle = () => { detailRow.hidden = !detailRow.hidden; details.open = !detailRow.hidden; if (!detailRow.hidden) renderMonthDetails(doc, detailContent, row, model); };
      const code = element(doc, 'button', row.code, 'detail-link'); code.type = 'button'; code.setAttribute('aria-label', `Abrir comparativo mensal: ${row.code} · ${row.label}`); code.addEventListener('click', event => { event.stopPropagation(); toggle(); });
      const variation = row.variationPercent === null ? '—' : percent(row.variationPercent);
      mainRow.append(element(doc, 'td', '', 'code-cell'), element(doc, 'td', row.label), element(doc, 'td', money(row.previousAmount), 'num'), element(doc, 'td', money(row.currentAmount), 'num'), element(doc, 'td', money(row.variation), `num ${row.variation < 0 ? 'negative' : 'positive'}`), element(doc, 'td', variation, `num ${row.variation < 0 ? 'negative' : 'positive'}`));
      mainRow.firstElementChild.append(code);
      mainRow.addEventListener('click', toggle); mainRow.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
      body.append(mainRow, detailRow);
    });
    if (!sortedRows.length) { const row = doc.createElement('tr'); row.append(element(doc, 'td', 'Nenhum registro encontrado. Limpe os filtros para voltar.')); row.firstElementChild.colSpan = 6; body.append(row); }
    table.append(body); tableWrapper.append(table); panel.append(tableWrapper);
    const footer = element(doc, 'div', '', 'bottom');
    footer.append(element(doc, 'span', `${previous.length + current.length} registros · ${rows.length} agrupamentos`, 'subtext'));
    const pages = element(doc, 'div', '', 'pagination'); const previousButton = element(doc, 'button', '←', 'secondary-action'); const nextButton = element(doc, 'button', '→', 'secondary-action'); previousButton.type = 'button'; nextButton.type = 'button'; previousButton.disabled = state.page === 0; nextButton.disabled = state.page >= pageCount - 1; previousButton.setAttribute('aria-label', 'Página anterior'); nextButton.setAttribute('aria-label', 'Próxima página'); previousButton.addEventListener('click', () => { state.page -= 1; draw(); }); nextButton.addEventListener('click', () => { state.page += 1; draw(); }); pages.append(previousButton, element(doc, 'span', `${state.page + 1} / ${pageCount}`), nextButton); footer.append(pages); panel.append(footer);
    content.append(panel);
    search.addEventListener('input', () => { state.search = search.value; state.page = 0; draw(); const nextSearch = content.querySelector('.search-input'); nextSearch?.focus(); nextSearch?.setSelectionRange(state.search.length, state.search.length); });
  }

  // Controls are created in the correct order above; keep the reset action local to those controls.
  const resetButton = filters.querySelector('.secondary-action');
  resetButton.onclick = () => {
    state.month = lastMonth(model.current); state.period = 'all'; state.organogram = ''; state.functionCode = ''; state.resource = ''; state.search = ''; state.page = 0;
    filterControls.forEach((control, index) => control.setValue(index === 0 ? String(state.month) : index === 1 ? 'all' : '', false));
    updateSummary(); draw();
  };
  updateSummary();
  draw();
  return { destroy() { root.remove(); } };
}
