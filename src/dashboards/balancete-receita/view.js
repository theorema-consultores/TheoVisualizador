import { GLOSSARY } from './glossary.js';
import { aggregate, formatVariation } from './data.js';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const TABS = [
  ['receita', 'descricao', 'Receita e descrição'], ['recurso', 'recurso', 'Recurso'], ['origem', 'origem', 'Origem do recurso'],
  ['aplicacao', 'aplicacao', 'Aplicação da fonte'], ['desdobramento', 'desdobramento', 'Desdobramento da fonte'], ['detalhamento', 'detalhamento', 'Detalhamento da fonte']
];
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const element = (doc, tag, text = '') => { const node = doc.createElement(tag); node.textContent = text; return node; };

export function renderBalancete(container, model) {
  const doc = container.ownerDocument;
  container.replaceChildren();
  const root = element(doc, 'section'); root.className = 'balancete';
  root.append(element(doc, 'h1', 'Dashboard Comparativo de Balancete da Receita'), element(doc, 'p', `${model.entityName} · ${model.previousYear} × ${model.currentYear}`));
  const currentTotal = model.current.reduce((sum, record) => sum + record.total, 0);
  const previousTotal = model.previous.reduce((sum, record) => sum + record.total, 0);
  const kpis = element(doc, 'div'); kpis.className = 'kpis';
  [['Exercício Atual', currentTotal], ['Exercício Anterior', previousTotal], ['Variação Anual', formatVariation(currentTotal, previousTotal)]].forEach(([label, value]) => {
    const card = element(doc, 'article'); card.append(element(doc, 'small', label), element(doc, 'strong', typeof value === 'number' ? money(value) : value)); kpis.append(card);
  });
  const selectedMonth = new Date().getMonth();
  const monthCard = element(doc, 'article');
  const monthLabel = element(doc, 'small', 'Mês de referência');
  const monthSelect = doc.createElement('select');
  MONTHS.forEach((month, index) => { const option = element(doc, 'option', month); option.value = String(index); option.selected = index === selectedMonth; monthSelect.append(option); });
  const monthValue = element(doc, 'strong');
  const updateMonth = () => { const index = Number(monthSelect.value); monthValue.textContent = `${money(model.current.reduce((sum, record) => sum + record.months[index], 0))} · anterior ${money(model.previous.reduce((sum, record) => sum + record.months[index], 0))}`; };
  monthSelect.addEventListener('change', updateMonth); updateMonth(); monthCard.append(monthLabel, monthSelect, monthValue); kpis.append(monthCard);
  root.append(kpis);
  const tabs = element(doc, 'div'); tabs.setAttribute('role', 'tablist');
  const content = element(doc, 'div');
  let sortColumn = 'current'; let sortDirection = -1;
  const draw = ([key, labelKey, label]) => {
    content.replaceChildren();
    const named = item => ({ ...item, label: GLOSSARY[key]?.[item.code] ?? item.label });
    const previous = Object.fromEntries(aggregate(model.previous, key, labelKey).map(named).map(item => [item.code, item]));
    const current = Object.fromEntries(aggregate(model.current, key, labelKey).map(named).map(item => [item.code, item]));
    const empty = label => ({ total: 0, label, months: Array(12).fill(0), count: 0 });
    const rows = [...new Set([...Object.keys(previous), ...Object.keys(current)])].map(code => ({ code, previous: previous[code] ?? empty(current[code]?.label ?? code), current: current[code] ?? empty(previous[code]?.label ?? code) })).sort((a, b) => { const av = sortColumn === 'code' ? a.code : sortColumn === 'label' ? a.current.label : a[sortColumn].total; const bv = sortColumn === 'code' ? b.code : sortColumn === 'label' ? b.current.label : b[sortColumn].total; return typeof av === 'string' ? sortDirection * av.localeCompare(bv, 'pt-BR') : sortDirection * (av - bv); });
    const filter = doc.createElement('input'); filter.type = 'search'; filter.placeholder = 'Filtrar por código ou descrição'; content.append(filter);
    const ranking = element(doc, 'section'); ranking.append(element(doc, 'h2', 'Top 8 - Exercício Atual'));
    rows.slice(0, 8).forEach(row => ranking.append(element(doc, 'p', `${row.code} · ${row.current.label}: ${money(row.current.total)}`)));
    content.append(ranking);
    const columns = [['code','Código'],['label','Descrição'],['previous',String(model.previousYear)],['current',String(model.currentYear)],['current','Variação']]; const table = element(doc, 'table'); const head = element(doc, 'thead'); const header = element(doc, 'tr'); columns.forEach(([column,value]) => { const th = element(doc, 'th'); const button = element(doc, 'button', value); button.type='button'; button.addEventListener('click', () => { sortDirection = sortColumn === column ? -sortDirection : 1; sortColumn = column; draw([key, labelKey, label]); }); th.append(button); header.append(th); }); head.append(header); table.append(head);
    const body = element(doc, 'tbody');
    rows.forEach(row => {
      const tr = element(doc, 'tr');
      [row.code, row.current.label, money(row.previous.total), money(row.current.total), formatVariation(row.current.total, row.previous.total)].forEach(value => tr.append(element(doc, 'td', value)));
      const detailRow = element(doc, 'tr'); const detailCell = element(doc, 'td'); detailCell.colSpan = 5;
      const details = element(doc, 'details'); details.append(element(doc, 'summary', 'Detalhar meses'));
      MONTHS.forEach((month, index) => details.append(element(doc, 'p', `${month}: ${money(row.previous.months[index])} → ${money(row.current.months[index])}`)));
      detailCell.append(details); detailRow.append(detailCell); body.append(tr, detailRow);
    });
    filter.addEventListener('input', () => [...body.rows].forEach(row => { row.hidden = !row.textContent.toLocaleLowerCase('pt-BR').includes(filter.value.toLocaleLowerCase('pt-BR')); }));
    table.append(body); content.append(table);
  };
  TABS.forEach((tab, index) => { const button = element(doc, 'button', tab[2]); button.type = 'button'; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(index === 0)); button.addEventListener('click', () => { [...tabs.children].forEach(item => item.setAttribute('aria-selected', 'false')); button.setAttribute('aria-selected', 'true'); draw(tab); }); tabs.append(button); });
  root.append(tabs, content); container.append(root); draw(TABS[0]);
  return { destroy() { root.remove(); } };
}
