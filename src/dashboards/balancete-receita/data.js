export function parseResource(resource) {
  const parts = String(resource ?? '').trim().replace(/-/g, '.').split('.');
  return { origem: parts[2] || '99', aplicacao: parts[3] || '99', desdobramento: parts[4] || '00', detalhamento: parts[5] || '00' };
}

function number(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`O campo ${name} deve ser numérico.`);
  return value;
}

function transform(record) {
  if (record?.tipoNatureza !== 'A') return null;
  const months = Array.from({ length: 12 }, (_, index) => number(record[`valorRealizado${index + 1}`], `valorRealizado${index + 1}`));
  const resource = String(record.numeroRecurso ?? '').trim();
  if (!resource || !String(record.numeroNaturezaReceita ?? '').trim() || typeof record.descNaturezaReceita !== 'string') throw new Error('Um registro analítico obrigatório está incompleto.');
  return { receita: String(record.numeroNaturezaReceita).trim(), descricao: record.descNaturezaReceita.trim(), recurso: resource, months, total: number(record.totalMeses, 'totalMeses'), entityName: typeof record.entidadeNome === 'string' ? record.entidadeNome.trim() : '', ...parseResource(resource) };
}

function parseExecutionIdentification(value) {
  const text = String(value ?? '');
  return {
    user: text.match(/Usuário:\s*([^.]*)\./i)?.[1]?.trim() || 'Não informado',
    dateTime: text.match(/Emissão:\s*(.+?)\.\s*Protocolo:/i)?.[1]?.trim() || 'Não informada'
  };
}

export async function loadBalancete(archive, { protocol = '', visualizationIndex = 0, dataFile } = {}) {
  const files = dataFile ? [dataFile] : archive.findByBasename('balancete-receita.json');
  if (!files.length) throw new Error('O ZIP não contém balancete-receita.json.');
  if (!files[visualizationIndex]) throw new Error('O ZIP não contém os dados desta visualização.');
  const results = archive.readJson(files[visualizationIndex])?.resultados;
  if (!Array.isArray(results) || results.length !== 2) throw new Error('O balancete deve possuir exatamente dois exercícios.');
  const years = results.map(result => ({ year: result?.exercicio, records: result?.registros, identification: parseExecutionIdentification(result?.relatorio?.siaficIdentificacao) }));
  if (!years.every(item => Number.isInteger(item.year) && Array.isArray(item.records)) || years[0].year === years[1].year) throw new Error('Os exercícios do balancete são inválidos.');
  years.sort((a, b) => a.year - b.year);
  const convert = item => item.records.map(transform).filter(Boolean);
  const previous = convert(years[0]);
  const current = convert(years[1]);
  const entityName = [...previous, ...current].map(record => record.entityName).find(Boolean) ?? 'Entidade não informada';
  const user = years.map(item => item.identification.user).find(value => value !== 'Não informado') ?? 'Não informado';
  const issues = years.map(item => ({ year: item.year, dateTime: item.identification.dateTime }));
  return { entityName, previousYear: years[0].year, currentYear: years[1].year, previous, current, execution: { protocol: protocol || 'Não informado', user, issues } };
}

export function formatVariation(current, previous) {
  if (previous === 0) return '—';
  return `${((current - previous) / Math.abs(previous) * 100).toFixed(2)}%`;
}

export function aggregate(records, key, label = key) {
  return Object.values(records.reduce((all, record) => {
    const code = record[key];
    const item = all[code] ??= { code, label: record[label] || code, total: 0, months: Array(12).fill(0), count: 0 };
    item.total += record.total; item.count += 1; record.months.forEach((value, index) => { item.months[index] += value; });
    return all;
  }, {}));
}
