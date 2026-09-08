import './styles.css';
import { openArchive } from './core/archive.js';
import { downloadResult } from './core/download.js';
import { resolveReport } from './core/resolver.js';
import { createTransferStore } from './core/transfer-store.js';
import { renderError } from './shared/shell.js';

document.documentElement.classList.add('js');

const app = document.getElementById('app');
resolveReport({
  search: window.location.search,
  session: window.sessionStorage,
  download: downloadResult,
  openArchive,
  transferStore: createTransferStore(),
  navigate: page => window.location.replace(page)
}).catch(error => {
  renderError(app, error, { retry: () => window.location.reload() });
});
