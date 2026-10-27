// Tela do treino em andamento (também usada para editar um treino do histórico)
import { state, save, getEx, previousSets } from '../store.js';
import { MUSCLES } from '../data.js';
import { esc, num, fmtNum, fmtKg, fmtClock, fmtRest, fmtDuration, plural } from '../util.js';
import { icon, menu, confirmBox, toast, sheet, unlockAudio } from '../ui.js';
import { go } from '../router.js';
import { newSet, addExercisesToActive, discardActive, finishActive, updateRoutineFrom, routineFromWorkout } from '../workout.js';
import { workoutVolume, newRecords } from '../stats.js';
import { openPicker } from './picker.js';

export const COLS = {
  peso: [['kg', 'KG'], ['reps', 'REPS']],
  corpo: [['reps', 'REPS']],
  tempo: [['sec', 'SEG']],
  cardio: [['km', 'KM'], ['min', 'MIN']]
};
const REQUIRED = { peso: ['reps'], corpo: ['reps'], tempo: ['sec'], cardio: ['min'] };

export function fmtSet(s, type) {
  if (!s) return '—';
  if (type === 'peso') return s.reps != null ? (s.kg != null ? `${fmtNum(s.kg, 2)} kg × ${s.reps}` : `${s.reps} reps`) : '—';
  if (type === 'corpo') return s.reps != null ? `${s.reps} reps` : '—';
  if (type === 'tempo') return s.sec != null ? `${s.sec}s` : '—';
  return [s.km != null ? fmtNum(s.km, 2) + ' km' : '', s.min != null ? fmtNum(s.min, 1) + ' min' : ''].filter(Boolean).join(' · ') || '—';
}

export const setTag = (s, n) => s.type === 'w' ? 'A' : s.type === 'f' ? 'F' : s.type === 'd' ? 'D' : String(n);

const a = () => state.active;
const findEx = el => a().exercises.find(e => e.id === el.closest('[data-ex]')?.dataset.ex);
const findSet = (el, e) => e?.sets.find(s => s.id === el.closest('[data-set]')?.dataset.set);
const prevFor = e => previousSets(e.exId, a().editing ? a().start : Infinity, a().editing);

let saveTimer;
const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); };

function statsHtml() {
  const w = a();
  const sets = w.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  const vol = workoutVolume({ exercises: w.exercises.map(e => ({ ...e, sets: e.sets.filter(s => s.done) })) });
  return `<div><small>Duração</small><b ${w.editing ? '' : 'data-clock'}>${w.editing ? fmtDuration(w.end - w.start) : fmtClock(Date.now() - w.start)}</b></div>
    <div><small>Volume</small><b>${fmtKg(vol)}</b></div><div><small>Séries</small><b>${sets}</b></div>`;
}

function exerciseCard(e) {
  const ex = getEx(e.exId), cols = COLS[ex.type], prev = prevFor(e);
  let n = 0;
  const rows = e.sets.map((s, i) => {
    if (s.type !== 'w') n++;
    const ph = f => f === 'reps' && s.t?.rmax ? `${s.t.reps}–${s.t.rmax}` : fmtNum(s.t?.[f] ?? prev[i]?.[f] ?? '', 2);
    return `<div class="set-row c${cols.length} ${s.done ? 'done' : ''}" data-set="${s.id}">
      <button class="set-tag t-${s.type}" data-act="setMenu" aria-label="Tipo da série">${setTag(s, n)}</button>
      <button class="prev" data-act="copyPrev" data-i="${i}" ${prev[i] ? '' : 'disabled'}>${esc(fmtSet(prev[i], ex.type))}</button>
      ${cols.map(([f, label]) => `<input data-f="${f}" inputmode="${f === 'reps' || f === 'sec' ? 'numeric' : 'decimal'}" enterkeyhint="next" autocomplete="off" aria-label="${label} série ${i + 1}" placeholder="${esc(ph(f))}" value="${s[f] != null ? esc(fmtNum(s[f], 2)) : ''}">`).join('')}
      <button class="check" data-act="check" aria-label="Concluir série" aria-pressed="${s.done}">${icon('check', 18)}</button>
    </div>`;
  }).join('');
  return `<article class="ex-card" data-ex="${e.id}">
    <div class="ex-head">
      <button class="ex-title" data-act="exHistory"><b>${esc(ex.name)}</b><small>${esc(MUSCLES[ex.muscle] || '')}</small></button>
      <button class="icon-btn" data-act="exMenu" aria-label="Opções do exercício">${icon('more')}</button>
    </div>
    ${e.tip ? `<p class="tip">${icon('bulb', 15)}<span>${esc(e.tip)}</span></p>` : ''}
    <input class="note" data-f="note" placeholder="Observação (ajuste do banco, pegada...)" value="${esc(e.notes)}" maxlength="140">
    ${ex.type !== 'cardio' ? `<button class="rest-chip" data-act="exRest">${icon('timer', 15)} Descanso: ${fmtRest(e.rest)}</button>` : ''}
    <div class="set-row c${cols.length} head"><span>SÉRIE</span><span>ANTERIOR</span>${cols.map(c => `<span>${c[1]}</span>`).join('')}<span>${icon('check', 14)}</span></div>
    ${rows}
    <button class="btn soft block" data-act="addSet">${icon('plus', 16)} Adicionar série</button>
  </article>`;
}

export const hideTabs = true;

export function render() {
  const w = a();
  if (!w) { setTimeout(() => go('/inicio', { replace: true })); return ''; }
  return `<header class="live-head">
      <button class="icon-btn" data-act="minimize" aria-label="Minimizar treino">${icon('down')}</button>
      <input class="live-name" data-f="name" value="${esc(w.name)}" aria-label="Nome do treino" maxlength="50">
      <button class="btn primary sm" data-act="finish">${w.editing ? 'Salvar' : 'Finalizar'}</button>
    </header>
    <div class="live-stats" id="liveStats">${statsHtml()}</div>
    ${w.exercises.length ? w.exercises.map(exerciseCard).join('') : `<div class="empty big">${icon('dumbbell', 34)}<b>Comece adicionando um exercício</b><span>Busque na biblioteca ou crie o seu.</span></div>`}
    <button class="btn primary block" data-act="addEx">${icon('plus', 18)} Adicionar exercício</button>
    <button class="btn danger-ghost block" data-act="discard">${w.editing ? 'Cancelar edição' : 'Descartar treino'}</button>`;
}

let wakeLock = null;
export function mount() {
  if (!a() || a().editing || wakeLock) return;
  navigator.wakeLock?.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
}
const releaseWake = () => { wakeLock?.release().catch(() => {}); wakeLock = null; };

const refreshStats = () => { const el = document.getElementById('liveStats'); if (el) el.innerHTML = statsHtml(); };

export function input(el) {
  const w = a(); if (!w) return;
  const f = el.dataset.f;
  if (f === 'name') w.name = el.value;
  else if (f === 'note') findEx(el).notes = el.value;
  else {
    const s = findSet(el, findEx(el));
    if (!s) return;
    s[f] = num(el.value);
    if (s.done) refreshStats();
  }
  saveSoon();
}

function startRest(sec) {
  const w = a();
  if (!sec || w.editing) return;
  w.restEnd = Date.now() + sec * 1000;
  w.restTotal = sec;
}

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

export const actions = {
  minimize: () => go('/inicio'),

  async check(el, rerender) {
    unlockAudio();
    const e = findEx(el), s = findSet(el, e), ex = getEx(e.exId);
    if (!s.done) {
      const prev = prevFor(e)[e.sets.indexOf(s)];
      for (const [f] of COLS[ex.type]) s[f] ??= s.t?.[f] ?? prev?.[f] ?? null;
      if (REQUIRED[ex.type].some(f => s[f] == null)) {
        toast(ex.type === 'tempo' ? 'Informe o tempo da série' : ex.type === 'cardio' ? 'Informe os minutos' : 'Informe as repetições');
        el.closest('[data-set]').querySelector(`[data-f="${REQUIRED[ex.type][0]}"]`)?.focus();
        return;
      }
      s.done = true;
      startRest(e.rest);
    } else s.done = false;
    save();
    rerender();
  },

  copyPrev(el, rerender) {
    const e = findEx(el), s = findSet(el, e), p = prevFor(e)[+el.dataset.i];
    if (!p) return;
    for (const [f] of COLS[getEx(e.exId).type]) s[f] = p[f] ?? null;
    save(); rerender();
  },

  addSet(el, rerender) {
    const e = findEx(el), last = e.sets.at(-1);
    e.sets.push(newSet(last ? { kg: last.kg ?? last.t?.kg, reps: last.reps ?? last.t?.reps, sec: last.sec ?? last.t?.sec, km: last.km ?? last.t?.km, min: last.min ?? last.t?.min } : {}));
    save(); rerender();
  },

  async setMenu(el, rerender) {
    const e = findEx(el), s = findSet(el, e);
    const v = await menu('Tipo da série', [
      { label: 'Normal', value: 'n' }, { label: 'Aquecimento (A)', value: 'w' },
      { label: 'Até a falha (F)', value: 'f' }, { label: 'Drop set (D)', value: 'd' },
      { label: 'Remover série', value: 'del', icon: 'trash', danger: true }
    ]);
    if (!v) return;
    if (v === 'del') e.sets.splice(e.sets.indexOf(s), 1);
    else s.type = v;
    save(); rerender();
  },

  async exRest(el, rerender) {
    const e = findEx(el);
    const v = await menu('Tempo de descanso', REST_OPTIONS.map(x => ({ label: fmtRest(x) + (x === e.rest ? '  ✓' : ''), value: String(x) })));
    if (v == null) return;
    e.rest = +v; save(); rerender();
  },

  exHistory(el) { go('/exercicio/' + findEx(el).exId); },

  async exMenu(el, rerender) {
    const w = a(), e = findEx(el), i = w.exercises.indexOf(e), ex = getEx(e.exId);
    const v = await menu(ex.name, [
      { label: 'Trocar exercício (aparelho ocupado?)', value: 'swap', icon: 'swap' },
      { label: 'Ver histórico e recordes', value: 'hist', icon: 'chart' },
      ...(i > 0 ? [{ label: 'Mover para cima', value: 'up', icon: 'up' }] : []),
      ...(i < w.exercises.length - 1 ? [{ label: 'Mover para baixo', value: 'down', icon: 'down' }] : []),
      { label: 'Remover exercício', value: 'del', icon: 'trash', danger: true }
    ]);
    if (v === 'swap') return openPicker({ title: `Trocar ${ex.name}`, multi: false, muscle: ex.muscle, onDone: ([id]) => {
      e.exId = id;
      e.sets.forEach(s => { s.t = {}; if (getEx(id).type !== ex.type) { s.kg = s.reps = s.sec = s.km = s.min = null; s.done = false; } });
      save(); rerender(); toast('Exercício trocado');
    } });
    if (v === 'hist') return go('/exercicio/' + e.exId);
    if (v === 'up' || v === 'down') { const j = v === 'up' ? i - 1 : i + 1; [w.exercises[i], w.exercises[j]] = [w.exercises[j], w.exercises[i]]; }
    if (v === 'del') { if (e.sets.some(s => s.done) && !(await confirmBox('Remover exercício?', 'As séries registradas dele serão perdidas.', 'Remover', true))) return; w.exercises.splice(i, 1); }
    if (v) { save(); rerender(); }
  },

  addEx(el, rerender) { openPicker({ onDone: ids => { addExercisesToActive(ids); rerender(); } }); },

  async discard() {
    const w = a();
    if (w.editing) { discardActive(); return go('/historico/' + w.editing, { replace: true }); }
    if (!(await confirmBox('Descartar treino?', 'Tudo o que foi registrado nesta sessão será perdido.', 'Descartar', true))) return;
    discardActive(); releaseWake(); go('/inicio', { replace: true }); toast('Treino descartado');
  },

  async finish(el, rerender) {
    const w = a();
    const pending = w.exercises.flatMap(e => e.sets.filter(s => !s.done).map(s => ({ e, s })));
    if (pending.length) {
      const v = await menu(`${plural(pending.length, 'série não marcada', 'séries não marcadas')}`, [
        { label: 'Concluir todas (usa os valores sugeridos)', value: 'all', icon: 'check' },
        { label: 'Salvar só as séries marcadas', value: 'done' }
      ]);
      if (!v) return;
      if (v === 'all') for (const { e, s } of pending) {
        const type = getEx(e.exId).type, prev = prevFor(e)[e.sets.indexOf(s)];
        for (const [f] of COLS[type]) s[f] ??= s.t?.[f] ?? prev?.[f] ?? null;
        if (REQUIRED[type].every(f => s[f] != null)) s.done = true;
      }
    }
    const wasEditing = w.editing;
    const saved = finishActive();
    if (!saved) { rerender(); return toast('Marque pelo menos uma série como concluída'); }
    releaseWake();
    go('/historico/' + saved.id, { replace: true });
    if (wasEditing) return toast('Treino atualizado');
    showSummary(saved);
  }
};

function showSummary(w) {
  const recs = newRecords(w), r = state.routines.find(x => x.id === w.routineId);
  const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
  sheet(`<div class="done-hero">${icon('trophy', 36)}<h3>Treino concluído!</h3><p class="muted">${state.workouts.length}º treino registrado no Duo Move.</p></div>
    <div class="summary-grid"><div><small>Duração</small><b>${fmtDuration(w.end - w.start)}</b></div><div><small>Volume</small><b>${fmtKg(workoutVolume(w))}</b></div><div><small>Séries</small><b>${sets}</b></div></div>
    ${recs.length ? `<div class="records"><h4>${icon('trophy', 16)} ${plural(recs.length, 'recorde pessoal', 'recordes pessoais')}</h4>${recs.map(x => `<div class="rec-line"><b>${esc(x.ex.name)}</b><span>${esc(x.label)}</span></div>`).join('')}</div>` : ''}
    ${r ? `<button class="btn soft block" data-act="updRoutine">Atualizar a rotina "${esc(r.name)}" com estes valores</button>`
        : `<button class="btn soft block" data-act="saveRoutine">Salvar como nova rotina</button>`}
    <button class="btn primary block" data-act="close">Fechar</button>`, {
    updRoutine: (el, api) => { updateRoutineFrom(w); api.close(); },
    saveRoutine: (el, api) => { state.routines.push(routineFromWorkout(w)); save(); api.close(); toast('Rotina criada'); }
  });
}
