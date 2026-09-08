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
