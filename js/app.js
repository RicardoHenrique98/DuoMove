import { state, save } from './store.js';
import { applyTheme } from './theme.js';
import { say, unlockVoice } from './voice.js';
import { route, onRender, rerender, go } from './router.js';
import { icon, beep, countdownTick, toast, unlockAudio } from './ui.js';
import { esc, fmtClock } from './util.js';
import * as home from './views/home.js';
import * as routines from './views/routines.js';
import * as history from './views/history.js';
import * as progress from './views/progress.js';
import * as profile from './views/profile.js';
import * as live from './views/live.js';
import * as plan from './views/plan.js';
import { checkBreak } from './planner.js';

route(/^\/inicio$/, home);
route(/^\/rotinas$/, routines);
route(/^\/rotina\/([^/]+)$/, routines.editor);
route(/^\/historico$/, history);
route(/^\/historico\/([^/]+)$/, history.detail);
route(/^\/progresso$/, progress);
route(/^\/exercicios$/, progress.library);
route(/^\/exercicio\/([^/]+)$/, progress.exercise);
route(/^\/perfil$/, profile);
route(/^\/treino$/, live);
route(/^\/plano$/, plan.page);
route(/^\/plano\/novo$/, plan.wizard);

const TABS = [['/inicio', 'home', 'Início'], ['/rotinas', 'list', 'Treinar'], ['/historico', 'clock', 'Histórico'], ['/progresso', 'chart', 'Progresso'], ['/perfil', 'user', 'Perfil']];

applyTheme();

const app = document.getElementById('app');
app.innerHTML = `<main id="view" class="view"></main><div id="mini"></div><div id="rest"></div>
  <nav class="tabbar" id="tabbar">${TABS.map(([p, ic, l]) => `<a href="#${p}" data-tab="${p}">${icon(ic, 22)}<span>${l}</span></a>`).join('')}</nav>`;
const view = document.getElementById('view'), tabbar = document.getElementById('tabbar');
let current = null, lastPath = null;

onRender((r, keepScroll) => {
  current = r;
  const y = window.scrollY;
  view.innerHTML = r.view.render(r.params);
  r.view.mount?.(view, r.params);
  const hide = !!r.view.hideTabs;
  document.body.classList.toggle('no-tabs', hide);
  tabbar.querySelectorAll('[data-tab]').forEach(a => a.classList.toggle('on', r.path.startsWith(a.dataset.tab) || (a.dataset.tab === '/historico' && r.path.startsWith('/historico'))));
  window.scrollTo(0, keepScroll && r.path === lastPath ? y : 0);
  lastPath = r.path;
  paintMini();
  paintRest();
});

const redraw = () => rerender();

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]');
  if (!el || el.closest('.sheet-back')) return;
  const fn = current?.view.actions?.[el.dataset.act] || globalActions[el.dataset.act];
  if (fn) { ev.preventDefault(); fn(el, redraw, ev); }
});

const onInput = ev => {
  if (ev.target.closest('.sheet-back') || !view.contains(ev.target)) return;
  current?.view.input?.(ev.target, redraw);
};
view.addEventListener('input', onInput);
view.addEventListener('change', ev => { if (ev.target.type === 'file' || ev.target.tagName === 'SELECT' || ev.target.type === 'checkbox') onInput(ev); });

// Enter no teclado do celular pula para o próximo campo da série
view.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter' || ev.target.tagName !== 'INPUT') return;
  const inputs = [...view.querySelectorAll('.set-row input')], i = inputs.indexOf(ev.target);
  if (i >= 0) { ev.preventDefault(); (inputs[i + 1] || ev.target).focus(); if (!inputs[i + 1]) ev.target.blur(); }
});

const globalActions = {
  openLive: () => go('/treino'),
  restAdd: el => { const a = state.active; if (!a?.restEnd) return; a.restEnd += +el.dataset.s * 1000; a.restTotal = Math.max(a.restTotal + +el.dataset.s, 1); save(); paintRest(); paintMini(); },
  restSkip: () => { if (state.active) { state.active.restEnd = null; save(); paintRest(); paintMini(); } }
};

function restLeft() { const a = state.active; return a?.restEnd ? a.restEnd - Date.now() : 0; }

function paintMini() {
  const el = document.getElementById('mini'), a = state.active;
  if (!a || current?.view === live || a.editing) { el.innerHTML = ''; document.body.classList.remove('has-mini'); return; }
  document.body.classList.add('has-mini');
  const left = restLeft();
  el.innerHTML = `<button class="mini" data-act="openLive"><span class="pulse"></span><span class="grow"><b>${esc(a.name)}</b><small>Treino em andamento · <span data-clock>${fmtClock(Date.now() - a.start)}</span>${left > 0 ? ` · descanso <span data-rest>${fmtClock(left)}</span>` : ''}</small></span>${icon('chevron')}</button>`;
}

function paintRest() {
  const el = document.getElementById('rest'), left = restLeft();
  if (current?.view !== live || left <= 0) { el.innerHTML = ''; document.body.classList.remove('has-rest'); return; }
  document.body.classList.add('has-rest');
  const pct = Math.max(0, Math.min(100, (left / (state.active.restTotal * 1000)) * 100));
  el.innerHTML = `<div class="restbar"><div class="rest-fill" style="width:${pct}%"></div>
    <button class="btn ghost sm" data-act="restAdd" data-s="-15">−15</button>
    <div class="grow center"><small>Descanso</small><b data-rest>${fmtClock(left)}</b></div>
    <button class="btn ghost sm" data-act="restAdd" data-s="15">+15</button>
    <button class="btn primary sm" data-act="restSkip">Pular</button></div>`;
}

// Relógio: atualiza cronômetro e descanso sem redesenhar a tela
setInterval(() => {
  const a = state.active;
  if (!a) return;
  live.tickRuns(redraw);
  document.querySelectorAll('[data-clock]').forEach(n => { n.textContent = fmtClock(Date.now() - a.start); });
  if (a.restEnd) {
    const left = a.restEnd - Date.now();
    if (left <= 0) {
      a.restEnd = null; save();
      // Voltou do segundo plano bem depois do fim: não bipa atrasado
      if (state.profile.sound && left > -3000) beep();
      paintRest(); paintMini();
      if (!live.onRestEnd(redraw)) { toast('Descanso finalizado. Bora para a próxima série!'); if (left > -3000) say(`Descanso terminado. ${live.nextSetLine()}`); }
    } else {
      if (state.profile.sound) countdownTick(left, a.restEnd);
      document.querySelectorAll('[data-rest]').forEach(n => { n.textContent = fmtClock(left); });
      const fill = document.querySelector('.rest-fill');
      if (fill) fill.style.width = `${Math.min(100, (left / (a.restTotal * 1000)) * 100)}%`;
    }
  }
}, 1000);

window.addEventListener('hashchange', () => rerender({ keepScroll: false }));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); else { unlockAudio(); if (state.active) rerender(); } });
// O iPhone só libera o som depois de um toque; qualquer toque serve
document.addEventListener('pointerdown', () => { unlockAudio(); unlockVoice(); });

// Abre direto no treino em andamento se o app foi fechado no meio dele
if (state.active && !state.active.editing && (!location.hash || location.hash === '#/inicio')) location.replace('#/treino');
// Ficou muito tempo sem treinar? O plano volta para uma readaptação
const brk = checkBreak();
rerender();
if (brk) toast(brk.why);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
