import { Notyf } from 'notyf';

const DURATION = 10_000;
const SUPPORT_URL = 'https://theorema.movidesk.com/';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

export function notifyMissingLicenses({ licenses = [], document: doc = globalThis.document, window: view = globalThis, NotyfClass = Notyf, supportUrl = SUPPORT_URL, clock = { now: Date.now, setTimeout: view.setTimeout.bind(view), clearTimeout: view.clearTimeout.bind(view) } } = {}) {
  const missing = [...new Set(licenses.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean))];
  if (!missing.length) return null;

  const notyf = new NotyfClass({
    duration: 0,
    dismissible: true,
    ripple: false,
    position: { x: 'left', y: 'bottom' },
    types: [{ type: 'license', className: 'license-notification', background: 'var(--brand-navy-deep)', icon: false }]
  });
  const list = missing.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const visualMessage = `<div class="license-notification__content"><strong>Alguns relatórios foram executados, porém você não possui licença para os seguintes relatórios:</strong><ul>${list}</ul><a class="license-notification__support" href="${escapeHtml(supportUrl)}" target="_blank" rel="noreferrer">Acionar suporte</a></div>`;
  const spokenMessage = `Alguns relatórios foram executados, porém você não possui licença para os seguintes relatórios: ${missing.join(', ')}. Acionar suporte.`;
  const notification = notyf.open({
    type: 'license',
    message: spokenMessage
  });
  const toast = [...(doc?.querySelectorAll?.('.license-notification') ?? [])].at(-1);
  if (toast) {
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-label', spokenMessage);
    const messageNode = toast.querySelector?.('.notyf__message');
    if (messageNode) messageNode.innerHTML = visualMessage;
    toast.querySelector?.('.notyf__dismiss-btn')?.setAttribute('aria-label', 'Fechar notificação de licenças sem acesso');
  }

  let remaining = DURATION;
  let startedAt = null;
  let timer = null;
  const active = () => (doc?.visibilityState ?? 'visible') !== 'hidden' && (typeof doc?.hasFocus !== 'function' || doc.hasFocus());
  const cleanup = () => {
    view.removeEventListener?.('focus', resume);
    view.removeEventListener?.('blur', pause);
    doc?.removeEventListener?.('visibilitychange', update);
  };
  const pause = () => {
    if (timer === null) return;
    clock.clearTimeout(timer);
    remaining -= Math.max(0, clock.now() - startedAt);
    timer = null;
    startedAt = null;
  };
  const resume = () => {
    if (!active() || timer !== null || remaining <= 0) return;
    startedAt = clock.now();
    timer = clock.setTimeout(() => {
      timer = null;
      remaining -= Math.max(0, clock.now() - startedAt);
      startedAt = null;
      if (remaining <= 0) {
        notyf.dismiss(notification);
        cleanup();
      } else {
        resume();
      }
    }, remaining);
  };
  const update = () => (active() ? resume() : pause());
  view.addEventListener?.('focus', resume);
  view.addEventListener?.('blur', pause);
  doc?.addEventListener?.('visibilitychange', update);
  notification.on?.('dismiss', cleanup);
  resume();
  return notyf;
}
