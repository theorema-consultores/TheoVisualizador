export function renderShell(container, { title = 'Carregando relatório…', detail = '' } = {}) {
  container.replaceChildren();
  const section = document.createElement('section');
  section.className = 'report-shell';
  const heading = document.createElement('h1');
  heading.textContent = title;
  const message = document.createElement('p');
  message.textContent = detail;
  const content = document.createElement('div');
  content.className = 'report-content';
  section.append(heading, message, content);
  container.append(section);
  return { content, setStatus(nextTitle, nextDetail = '') { heading.textContent = nextTitle; message.textContent = nextDetail; } };
}

export function renderProtocolPrompt(container, { navigate = url => container.ownerDocument.defaultView.location.assign(url), storage } = {}) {
  const doc = container.ownerDocument;
  storage ??= doc.defaultView.localStorage;
  container.replaceChildren();
  const section = doc.createElement('section'); section.className = 'report-shell protocol-prompt';
  const heading = doc.createElement('h1'); heading.textContent = 'Informe um protocolo para abrir o relatório';
  const message = doc.createElement('p'); message.textContent = 'Digite o protocolo recebido ao emitir o relatório.';
  const form = doc.createElement('form'); form.className = 'protocol-form';
  const label = doc.createElement('label'); label.htmlFor = 'protocol-input'; label.textContent = 'Protocolo';
  const input = doc.createElement('input'); input.id = 'protocol-input'; input.name = 'protocolo'; input.type = 'text'; input.required = true; input.placeholder = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; input.autocomplete = 'off';
  const recent = JSON.parse(storage.getItem('report.recentProtocols') || '[]');
  if (recent.length) {
    const recentLabel = doc.createElement('label'); recentLabel.htmlFor = 'recent-protocol'; recentLabel.textContent = 'Protocolos recentes';
    const dropdown = doc.createElement('div'); dropdown.className = 'protocol-dropdown dropdown';
    const toggle = doc.createElement('button'); toggle.type = 'button'; toggle.id = 'recent-protocol'; toggle.className = 'dropdown-toggle'; toggle.setAttribute('aria-haspopup', 'listbox'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Selecione um protocolo';
    const menu = doc.createElement('div'); menu.className = 'dropdown-menu'; menu.setAttribute('role', 'listbox'); menu.hidden = true;
    recent.forEach(protocol => { const option = doc.createElement('button'); option.type = 'button'; option.className = 'dropdown-item'; option.setAttribute('role', 'option'); option.textContent = protocol; option.addEventListener('click', () => { input.value = protocol; toggle.textContent = protocol; menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }); menu.append(option); });
    toggle.addEventListener('click', () => { menu.hidden = !menu.hidden; toggle.setAttribute('aria-expanded', String(!menu.hidden)); });
    toggle.addEventListener('keydown', event => { if (event.key === 'Escape') { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); } });
    dropdown.append(toggle, menu); form.append(recentLabel, dropdown);
  }
  const button = doc.createElement('button'); button.type = 'submit'; button.textContent = 'Abrir relatório';
  form.append(label, input, button);
  form.addEventListener('submit', event => { event.preventDefault(); navigate(`?protocolo=${encodeURIComponent(input.value.trim())}`); });
  section.append(heading, message, form);
  container.append(section);
}

export function renderError(container, error, { retry } = {}) {
  container.replaceChildren();
  const section = document.createElement('section'); section.className = 'report-shell report-error';
  const heading = document.createElement('h1'); heading.textContent = 'Não foi possível abrir o relatório';
  const message = document.createElement('p'); message.textContent = error.message;
  section.append(heading, message);
  if (retry) { const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Tentar novamente'; button.addEventListener('click', retry); section.append(button); }
  container.append(section);
}
