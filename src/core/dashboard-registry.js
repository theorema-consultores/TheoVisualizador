import { mountBalancete } from '../dashboards/balancete-receita/index.js';
import { loadBalancete } from '../dashboards/balancete-receita/data.js';

const DASHBOARDS = [
  { id: 'balancete-receita', label: 'B. Receita', version: '1.0.0', page: 'dashboards/balancete-receita/', load: loadBalancete, mount: mountBalancete }
];

export function resolveDashboard(metadata) {
  const found = DASHBOARDS.find(entry => entry.id === metadata.dashboard.id && entry.version === metadata.dashboard.version);
  if (found) return { ...found };
  const sameId = DASHBOARDS.some(entry => entry.id === metadata.dashboard.id);
  throw new Error(sameId ? 'Versão do dashboard não suportada.' : 'O dashboard solicitado não está registrado.');
}

export function dashboardLabel(id) {
  return DASHBOARDS.find(entry => entry.id === id)?.label ?? id;
}
