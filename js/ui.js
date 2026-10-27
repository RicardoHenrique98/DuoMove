import { esc } from './util.js';

const PATHS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  list: 'M4 6h16M4 12h16M4 18h10',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5 10 17 19 7',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  back: 'M15 18 9 12l6-6',
  chevron: 'm9 18 6-6-6-6',
  timer: 'M12 9v4l2 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  play: 'M7 4v16l13-8z',
  x: 'M6 6l12 12M18 6 6 18',
  search: 'm21 21-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  swap: 'M7 16V4M7 4 3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4',
  up: 'm6 15 6-6 6 6',
  down: 'm6 9 6 6 6-6',
  trophy: 'M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  fire: 'M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  upload: 'M12 20V8M7 13l5-5 5 5M5 4h14',
  dumbbell: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12'
};

export const icon = (name, size = 20) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name]}"/></svg>`;

let toastTimer;
export function toast(text) {
  document.querySelector('.toast')?.remove();
  const n = document.createElement('div');
  n.className = 'toast';
  n.setAttribute('role', 'status');
  n.textContent = text;
  document.body.append(n);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => n.remove(), 2400);
}

// Janela inferior (bottom sheet). handlers: { acao(el, modal) }
export function sheet(html, handlers = {}, { full = false, onClose } = {}) {
  const back = document.createElement('div');
  back.className = 'sheet-back';
  back.innerHTML = `<section class="sheet ${full ? 'full' : ''}" role="dialog" aria-modal="true"><div class="grip"></div>${html}</section>`;
  const close = () => { back.remove(); onClose?.(); };
  const api = { el: back.firstElementChild, close };
  back.addEventListener('click', ev => {
    if (ev.target === back) return close();
    const t = ev.target.closest('[data-act]');
    if (!t || !back.contains(t)) return;
    ev.stopPropagation();
    if (t.dataset.act === 'close') return close();
    handlers[t.dataset.act]?.(t, api, ev);
  });
  if (handlers.input) back.addEventListener('input', ev => handlers.input(ev.target, api, ev));
  document.body.append(back);
  return api;
}

export function menu(title, items) {
  return new Promise(resolve => {
    const m = sheet(`<h3 class="sheet-title">${esc(title)}</h3><div class="menu">${items.map((it, i) =>
      `<button class="menu-item ${it.danger ? 'danger' : ''}" data-act="pick" data-i="${i}">${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span></button>`).join('')}</div>
      <button class="btn ghost block" data-act="close">Cancelar</button>`,
      { pick: (el, api) => { resolve(items[+el.dataset.i].value); api.close(); } },
      { onClose: () => resolve(null) });
    m.el.querySelector('.menu-item')?.focus();
  });
}

export function confirmBox(title, text, okLabel = 'Confirmar', danger = false) {
  return new Promise(resolve => {
    let answered = false;
    sheet(`<h3 class="sheet-title">${esc(title)}</h3><p class="muted">${esc(text)}</p>
      <div class="row gap"><button class="btn ghost grow" data-act="close">Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'} grow" data-act="ok">${esc(okLabel)}</button></div>`,
      { ok: (el, api) => { answered = true; resolve(true); api.close(); } },
      { onClose: () => { if (!answered) resolve(false); } });
  });
}

// Bipe curto ao fim do descanso (o AudioContext é liberado no primeiro toque)
let audio;
export function unlockAudio() {
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch { /* sem áudio */ }
}
export function beep() {
  if (!audio) return;
  const t = audio.currentTime;
  [0, 0.25].forEach(d => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.3, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
    o.connect(g).connect(audio.destination);
    o.start(t + d); o.stop(t + d + 0.2);
  });
  navigator.vibrate?.([200, 100, 200]);
}
