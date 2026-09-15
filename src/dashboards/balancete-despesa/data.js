const MONTH_COUNT = 12;

const text = value => String(value ?? '').trim();

function number(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`O campo ${name} deve ser numérico.`);
  }
  return value;
}

function transform(record) {
  const natureza = text(record?.natureza);
  const descricao = text(record?.descricao);
  if (!natureza || !descricao) {
    throw new Error('Um registro obrigatório da despesa está incompleto.');
  }

  const months = Array.from({ length: MONTH_COUNT }, (_, index) => (
    number(record[`valorPago${index + 1}`], `valorPago${index + 1}`)
  ));

  return {
    nature: natureza,
    natureza,
    description: descricao,
    descricao,
    natureDescription: `${natureza} · ${descricao}`,
    organogram: text(record?.organograma) || 'Não informado',
    organogramDescription: text(record?.descricaoOrganograma) || 'Não informado',
    functionCode: text(record?.funcao) || 'Não informado',
    functionDescription: text(record?.descricaoFuncao) || 'Não informado',
    resource: text(record?.recurso) || 'Não informado',
    resourceDescription: text(record?.descricaoRecurso) || 'Não informado',
    entityName: text(record?.entidadeNome),
    months,
    total: number(record?.totalMeses, 'totalMeses')
  };
}

function parseExecutionIdentification(value) {
  const source = text(value);
  return {
    user: source.match(/Usuário:\s*([^.]*)\./i)?.[1]?.trim() || 'Não informado',
    dateTime: source.match(/Emissão:\s*(.+?)\.\s*Protocolo:/i)?.[1]?.trim() || 'Não informada'
  };
}

export async function loadBalanceteDespesa(archive, { protocol = '', visualizationIndex = 0, dataFile } = {}) {
  const files = dataFile ? [dataFile] : archive.findByBasename('balancete-despesa.json');
  if (!files.length) throw new Error('O ZIP não contém balancete-despesa.json.');
  if (!dataFile && files.length !== 1) throw new Error('O ZIP contém mais de um balancete-despesa.json.');
  const file = dataFile ?? files[visualizationIndex];
  if (!file) throw new Error('O ZIP não contém os dados desta visualização.');

  const results = archive.readJson(file)?.resultados;
  if (!Array.isArray(results) || results.length !== 2) {
    throw new Error('O balancete da despesa deve possuir exatamente dois exercícios.');
  }

  const years = results.map(result => ({
    year: result?.exercicio,
    records: Array.isArray(result?.registros) ? result.registros.map(transform) : null,
    identification: parseExecutionIdentification(result?.relatorio?.siaficIdentificacao)
  }));
  if (!years.every(item => Number.isInteger(item.year) && Array.isArray(item.records)) || years[0].year === years[1].year) {
    throw new Error('Os exercícios do balancete da despesa são inválidos.');
  }
  years.sort((left, right) => left.year - right.year);

  const records = years.flatMap(item => item.records);
  const entityName = records.map(record => record.entityName).find(Boolean) ?? 'Entidade não informada';
  const user = years.map(item => item.identification.user).find(value => value !== 'Não informado') ?? 'Não informado';
  const issues = years.map(item => ({ year: item.year, dateTime: item.identification.dateTime }));
  return {
    entityName,
    previousYear: years[0].year,
    currentYear: years[1].year,
    previous: years[0].records,
    current: years[1].records,
    execution: { protocol: protocol || 'Não informado', user, issues }
  };
}

export function formatVariation(current, previous) {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous) * 100;
}

export function aggregate(records, group) {
  const groups = new Map();
  records.forEach(record => {
    const [code, label] = group(record);
    const key = `${code}\u0000${label}`;
    const item = groups.get(key) ?? {
      code,
      label,
      total: 0,
      months: Array(MONTH_COUNT).fill(0),
      count: 0
    };
    item.total += record.total;
    item.count += 1;
    record.months.forEach((value, index) => { item.months[index] += value; });
    groups.set(key, item);
  });
  return [...groups.values()];
}
