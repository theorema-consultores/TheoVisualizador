const DASHBOARDS = [
  { id: 'balancete-receita', version: '1.0.0', page: 'dashboards/balancete-receita/' }
];

export function resolveDashboard(metadata) {
  const found = DASHBOARDS.find(entry => entry.id === metadata.dashboard.id && entry.version === metadata.dashboard.version);
  if (found) return { ...found };
  const sameId = DASHBOARDS.some(entry => entry.id === metadata.dashboard.id);
  throw new Error(sameId ? 'Versão do dashboard não suportada.' : 'O dashboard solicitado não está registrado.');
}
