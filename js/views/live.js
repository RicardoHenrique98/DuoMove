// Tela do treino em andamento (também usada para editar um treino do histórico)
import { state, save, getEx, previousSets } from '../store.js';
import { MUSCLES, imgUrl, IMG_ERR } from '../data.js';
import { esc, num, fmtNum, fmtKg, fmtClock, fmtRest, fmtDuration, plural } from '../util.js';
import { icon, menu, confirmBox, toast, sheet, unlockAudio, beep } from '../ui.js';
import { go } from '../router.js';
import { newSet, addExercisesToActive, discardActive, finishActive, updateRoutineFrom, routineFromWorkout } from '../workout.js';
import { workoutVolume, workoutKm, newRecords } from '../stats.js';
import { openPicker, openSwap } from './picker.js';
import { suggest } from '../coach.js';
import { FEEDBACK, PHASES, afterPlanWorkout } from '../planner.js';
import { SET_TYPES, TECHNIQUES, applyTechnique, restAfter, isMain, groupName } from '../techniques.js';

export const COLS = {
  peso: [['kg', 'KG'], ['reps', 'REPS']],
  corpo: [['reps', 'REPS']],
  tempo: [['sec', 'SEG']],
  cardio: [['km', 'KM'], ['min', 'MIN']]
};
const COACH_ICON = { up: 'up', keep: 'check', down: 'down', new: 'bulb' };
const REQUIRED = { peso: ['reps'], corpo: ['reps'], tempo: ['sec'], cardio: ['min'] };

export function fmtSet(s, type) {
  if (!s) return '—';
  if (type === 'peso') return s.reps != null ? (s.kg != null ? `${fmtNum(s.kg, 2)} kg × ${s.reps}` : `${s.reps} reps`) : '—';
  if (type === 'corpo') return s.reps != null ? `${s.reps} reps` : '—';
  if (type === 'tempo') return s.sec != null ? `${s.sec}s` : '—';
  return [s.km != null ? fmtNum(s.km, 2) + ' km' : '', s.min != null ? fmtNum(s.min, 1) + ' min' : ''].filter(Boolean).join(' · ') || '—';
}

export const setTag = (s, n) => SET_TYPES[s.type]?.tag || String(n);
// Técnicas presentes no exercício, para explicar na tela
export function techList(e) {
  const keys = new Set();
  if (e.tech) keys.add(e.tech);
  for (const s of e.sets) { if (s.type === 'd') keys.add('drop'); if (s.type === 'r') keys.add('restpause'); if (s.type === 'c') keys.add('cluster'); }
  if (e.group) keys.add('superset');
  return [...keys].filter(k => TECHNIQUES[k]);
}

const a = () => state.active;
const findEx = el => a().exercises.find(e => e.id === el.closest('[data-ex]')?.dataset.ex);
const findSet = (el, e) => e?.sets.find(s => s.id === el.closest('[data-set]')?.dataset.set);
const prevFor = e => previousSets(e.exId, a().editing ? a().start : Infinity, a().editing);
// Série equivalente da última vez: aquecimento com aquecimento, série válida com série válida
const cat = s => isMain(s) ? 'm' : s.type;
function prevAt(e, s, prev = prevFor(e)) {
  const same = prev.filter(p => cat(p) === cat(s));
  return same[e.sets.filter(x => cat(x) === cat(s)).indexOf(s)];
}

let saveTimer;
const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); };

function statsHtml() {
  const w = a();
  const sets = w.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  const doneW = { exercises: w.exercises.map(e => ({ ...e, sets: e.sets.filter(s => s.done) })) };
  const vol = workoutVolume(doneW);
  const cardioOnly = w.exercises.length && w.exercises.every(e => getEx(e.exId).type === 'cardio');
  return `<div><small>Duração</small><b ${w.editing ? '' : 'data-clock'}>${w.editing ? fmtDuration(w.end - w.start) : fmtClock(Date.now() - w.start)}</b></div>
    ${cardioOnly ? `<div><small>Distância</small><b>${fmtNum(workoutKm(doneW), 2) || 0} km</b></div>` : `<div><small>Volume</small><b>${fmtKg(vol)}</b></div>`}<div><small>Séries</small><b>${sets}</b></div>`;
}

function exerciseCard(e, i, all) {
  const ex = getEx(e.exId), cols = COLS[ex.type], prevAll = prevFor(e);
  const group = e.group ? all.filter(x => x.group === e.group) : null;
  let n = 0;
  const rows = e.sets.map((s, i) => {
    if (isMain(s)) n++;
    const pv = prevAt(e, s, prevAll);
    const ph = f => f === 'reps' && s.t?.rmax && !s.t.coach ? `${s.t.reps}–${s.t.rmax}` : fmtNum(s.t?.[f] ?? pv?.[f] ?? '', 2);
    return `<div class="set-row c${cols.length} ${s.done ? 'done' : ''}" data-set="${s.id}">
      <button class="set-tag t-${s.type}" data-act="setMenu" aria-label="Tipo da série">${setTag(s, n)}</button>
      ${ex.type === 'cardio' && !s.done && (s.t?.min || s.runEnd)
        ? `<button class="prev timer ${s.runEnd ? 'on' : ''}" data-act="runSet">${s.runEnd ? `${icon('x', 13)} <span data-run="${s.id}">${fmtClock(s.runEnd - Date.now())}</span>` : `${icon('play', 13)} ${fmtClock(s.t.min * 60000)}`}</button>`
        : `<button class="prev" data-act="copyPrev" ${pv ? '' : 'disabled'}>${esc(fmtSet(pv, ex.type))}</button>`}
      ${cols.map(([f, label]) => `<input data-f="${f}" inputmode="${f === 'reps' || f === 'sec' ? 'numeric' : 'decimal'}" enterkeyhint="next" autocomplete="off" aria-label="${label} série ${i + 1}" placeholder="${esc(ph(f))}" value="${s[f] != null ? esc(fmtNum(s[f], 2)) : ''}">`).join('')}
      <button class="check" data-act="check" aria-label="Concluir série" aria-pressed="${s.done}">${icon('check', 18)}</button>
    </div>`;
  }).join('');
  const techs = techList(e).filter(k => k !== 'superset');
  return `<article class="ex-card ${group ? 'grouped' : ''}" data-ex="${e.id}">
    ${group ? `<div class="group-tag">${icon('swap', 13)} ${groupName(group.length).toUpperCase()} · ${group.indexOf(e) + 1}/${group.length}${group.indexOf(e) < group.length - 1 ? ' · sem descanso, vá para o próximo' : ' · descanse no fim da rodada'}</div>` : ''}
    <div class="ex-head">
      ${ex.photo ? `<img class="ex-thumb" src="${ex.photo}" alt="" data-act="exHistory">` : ex.img ? `<img class="ex-thumb" src="${imgUrl(ex.img, 0)}" alt="" loading="lazy" data-act="exHistory" ${IMG_ERR}>` : ''}
      <button class="ex-title" data-act="exHistory"><b>${esc(ex.name)}</b><small>${esc(MUSCLES[ex.muscle] || '')} · ver como fazer</small></button>
      <button class="icon-btn" data-act="exMenu" aria-label="Opções do exercício">${icon('more')}</button>
    </div>
    ${e.coach ? `<p class="coach c-${e.coach.tone}">${icon(COACH_ICON[e.coach.tone], 15)}<span><b>Treinador:</b> ${esc(e.coach.msg)}</span></p>` : ''}
    ${techs.map(k => `<p class="tech"><b>${esc(TECHNIQUES[k].label)}:</b> ${esc(TECHNIQUES[k].desc)}</p>`).join('')}
    ${!e.tip && ex.tip ? `<p class="tip">${icon('bulb', 15)}<span>${esc(ex.tip)}</span></p>` : ''}
    ${e.tip ? `<p class="tip">${icon('bulb', 15)}<span>${esc(e.tip)}</span></p>` : ''}
    <input class="note" data-f="note" placeholder="${ex.type === 'cardio' ? 'Observação (percurso, como se sentiu...)' : 'Observação (ajuste do banco, pegada...)'}" value="${esc(e.notes)}" maxlength="140">
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
    ${w.exercises.length ? w.exercises.map((e, i, all) => exerciseCard(e, i, all)).join('') : `<div class="empty big">${icon('dumbbell', 34)}<b>Comece adicionando um exercício</b><span>Busque na biblioteca ou crie o seu.</span></div>`}
    <button class="btn primary block" data-act="addEx">${icon('plus', 18)} Adicionar exercício</button>
    <button class="btn danger-ghost block" data-act="discard">${w.editing ? 'Cancelar edição' : 'Descartar treino'}</button>`;
}

// Chamado a cada segundo pelo app: atualiza cronômetros e conclui o intervalo no fim
export function tickRuns(rerender) {
  const w = a();
  if (!w) return;
  for (const e of w.exercises) for (const s of e.sets) {
    if (!s.runEnd) continue;
    const left = s.runEnd - Date.now();
    if (left > 0) { const n = document.querySelector(`[data-run="${s.id}"]`); if (n) n.textContent = fmtClock(left); continue; }
    s.runEnd = null; s.min ??= s.t.min; s.done = true;
    const r = restAfter(w.exercises, e, s, e.rest);
    if (r.rest) startRest(r.rest); else w.restEnd = null;
    if (state.profile.sound) beep();
    toast(r.rest ? `Intervalo concluído. Recupere por ${fmtRest(r.rest)}.` : 'Intervalo concluído!');
    save(); rerender();
  }
}

// Fim da recuperação: se o próximo é um intervalo de cardio, ele começa sozinho
export function onRestEnd(rerender) {
  const w = a();
  if (!w) return;
  for (const e of w.exercises) {
    if (getEx(e.exId).type !== 'cardio' || e.sets.length < 2) continue;
    const i = e.sets.findIndex(s => !s.done);
    if (i > 0 && e.sets[i - 1].done && e.sets[i].t?.min && !e.sets[i].runEnd) {
      e.sets[i].runEnd = Date.now() + e.sets[i].t.min * 60000;
      toast('Próximo intervalo: vai!');
      save(); rerender();
      return;
    }
  }
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
      const prev = prevAt(e, s);
      for (const [f] of COLS[ex.type]) s[f] ??= s.t?.[f] ?? prev?.[f] ?? null;
      if (REQUIRED[ex.type].some(f => s[f] == null)) {
        toast(ex.type === 'tempo' ? 'Informe o tempo da série' : ex.type === 'cardio' ? 'Informe os minutos' : 'Informe as repetições');
        el.closest('[data-set]').querySelector(`[data-f="${REQUIRED[ex.type][0]}"]`)?.focus();
        return;
      }
      s.done = true;
      const r = restAfter(a().exercises, e, s, e.rest);
      if (r.rest) startRest(r.rest); else a().restEnd = null;
      save(); rerender();
      if (r.next) {
        toast(`Sem descanso: agora ${getEx(r.next.exId).name}`);
        document.querySelector(`[data-ex="${r.next.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    } else s.done = false;
    save();
    rerender();
  },

  // Cronômetro de intervalo para séries de cardio (toque de novo para parar)
  runSet(el, rerender) {
    unlockAudio();
    const e = findEx(el), s = findSet(el, e);
    if (s.runEnd) { s.min = Math.round((s.t.min * 60000 - Math.max(0, s.runEnd - Date.now())) / 6000) / 10; s.runEnd = null; }
    else { s.runEnd = Date.now() + s.t.min * 60000; a().restEnd = null; }
    save(); rerender();
  },

  copyPrev(el, rerender) {
    const e = findEx(el), s = findSet(el, e), p = prevAt(e, s);
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
      { label: 'Até a falha (F)', value: 'f' }, { label: 'Drop set (D) — sem descanso antes', value: 'd' },
      { label: 'Rest-pause (RP) — 15 s antes', value: 'r' }, { label: 'Cluster (C) — 20 s antes', value: 'c' },
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
      { label: 'Técnicas avançadas (drop, pirâmide...)', value: 'tech', icon: 'fire' },
      ...(e.group ? [{ label: 'Desfazer bi-set', value: 'ungroup', icon: 'x' }]
        : i < w.exercises.length - 1 ? [{ label: `Bi-set com ${getEx(w.exercises[i + 1].exId).name}`, value: 'group', icon: 'swap' }] : []),
      ...(i > 0 ? [{ label: 'Mover para cima', value: 'up', icon: 'up' }] : []),
      ...(i < w.exercises.length - 1 ? [{ label: 'Mover para baixo', value: 'down', icon: 'down' }] : []),
      { label: 'Remover exercício', value: 'del', icon: 'trash', danger: true }
    ]);
    if (v === 'swap') return openSwap({ exId: e.exId, exclude: w.exercises.map(x => x.exId), onPick: id => {
      swapExercise(e, id);
      save(); rerender(); toast(`Trocado por ${getEx(id).name}`);
    } });
    if (v === 'hist') return go('/exercicio/' + e.exId);
    if (v === 'tech') return pickTechnique(e, rerender);
    if (v === 'group') linkWithNext(w.exercises, i);
    if (v === 'ungroup') unlink(w.exercises, e);
    if (v === 'up' || v === 'down') { const j = v === 'up' ? i - 1 : i + 1; [w.exercises[i], w.exercises[j]] = [w.exercises[j], w.exercises[i]]; }
    if (v === 'del') { if (e.sets.some(s => s.done) && !(await confirmBox('Remover exercício?', 'As séries registradas dele serão perdidas.', 'Remover', true))) return; if (e.group) unlink(w.exercises, e); w.exercises.splice(i, 1); }
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
        const type = getEx(e.exId).type, prev = prevAt(e, s);
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

// Troca o exercício mantendo séries, faixas e técnicas; o treinador recalcula a carga
function swapExercise(e, id) {
  const oldType = getEx(e.exId).type, type = getEx(id).type, w = a();
  e.exId = id;
  const pending = e.sets.filter(s => !s.done);
  for (const s of e.sets) {
    const keep = { reps: s.t?.reps, rmax: s.t?.rmax, sec: s.t?.sec, min: s.t?.min };
    s.t = Object.fromEntries(Object.entries(keep).filter(([, v]) => v != null));
    if (type !== oldType) { s.kg = s.reps = s.sec = s.km = s.min = null; s.done = false; }
  }
  const phase = w.plan?.phase;
  const c = suggest(id, pending.map(s => ({ type: s.type, ...s.t })), { rir: phase ? PHASES[phase]?.rir : undefined, deload: phase === 'deload' });
  e.coach = c ? { tone: c.tone, msg: c.msg } : null;
  pending.forEach((s, i) => { if (c?.sets[i]) { Object.assign(s.t, c.sets[i]); s.t.coach = true; } });
}

export async function chooseTechnique() {
  return menu('Técnicas avançadas', [
    ...Object.entries(TECHNIQUES).filter(([k]) => k !== 'superset').map(([k, t]) => ({ label: t.label, desc: t.desc, value: k })),
    { label: 'Remover técnicas', value: 'clear', icon: 'x' }
  ]);
}

async function pickTechnique(e, rerender) {
  const key = await chooseTechnique();
  if (!key) return;
  const prev = prevFor(e);
  e.sets = applyTechnique(key, e.sets, {
    tgt: s => (s.t ||= {}),
    make: (t, type) => newSet(t, type),
    locked: s => s.done,
    baseKg: s => s.kg ?? s.t?.kg ?? prevAt(e, s, prev)?.kg ?? null
  });
  e.tech = key.startsWith('pyr') ? key : key === 'clear' ? null : e.tech;
  save(); rerender();
  if (key !== 'clear') toast(`${TECHNIQUES[key].label} aplicado`);
}

// Bi-set / tri-set: exercícios vizinhos com o mesmo grupo
export function linkWithNext(list, i) {
  const a = list[i], b = list[i + 1];
  const g = a.group || b.group || 'g' + Date.now().toString(36);
  a.group = b.group = g;
}
export function unlink(list, e) {
  const g = e.group, members = list.filter(x => x.group === g);
  e.group = null;
  if (members.length <= 2) members.forEach(x => { x.group = null; });
}

function showSummary(w) {
  const recs = newRecords(w), r = state.routines.find(x => x.id === w.routineId);
  const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
  let answered = false;
  // Treino do plano: o feedback ajusta os próximos treinos
  const planBlock = w.plan ? `<div class="feedback" id="fb"><b>Como foi o treino?</b><small class="muted">O treinador usa isso para ajustar os próximos.</small>
      <div class="fb-grid">${FEEDBACK.map(([v, l, d]) => `<button class="fb" data-act="fb" data-v="${v}"><b>${l}</b><small>${d}</small></button>`).join('')}</div></div>` : '';
  sheet(`<div class="done-hero">${icon('trophy', 36)}<h3>Treino concluído!</h3><p class="muted">${state.workouts.length}º treino registrado no Duo Move.</p></div>
    <div class="summary-grid"><div><small>Duração</small><b>${fmtDuration(w.end - w.start)}</b></div><div><small>Volume</small><b>${fmtKg(workoutVolume(w))}</b></div><div><small>Séries</small><b>${sets}</b></div></div>
    ${recs.length ? `<div class="records"><h4>${icon('trophy', 16)} ${plural(recs.length, 'recorde pessoal', 'recordes pessoais')}</h4>${recs.map(x => `<div class="rec-line"><b>${esc(x.ex.name)}</b><span>${esc(x.label)}</span></div>`).join('')}</div>` : ''}
    ${planBlock}
    ${w.plan ? '' : r ? `<button class="btn soft block" data-act="updRoutine">Atualizar a rotina "${esc(r.name)}" com estes valores</button>`
        : `<button class="btn soft block" data-act="saveRoutine">Salvar como nova rotina</button>`}
    <button class="btn primary block" data-act="close">Fechar</button>`, {
    updRoutine: (el, api) => { updateRoutineFrom(w); api.close(); },
    saveRoutine: (el, api) => { state.routines.push(routineFromWorkout(w)); save(); api.close(); toast('Rotina criada'); },
    fb: (el, api) => {
      if (answered) return;
      answered = true;
      const change = afterPlanWorkout(w, +el.dataset.v);
      api.el.querySelector('#fb').innerHTML = change?.phase
        ? `<div class="phase-change"><small>NOVA FASE</small><b>${esc(PHASES[change.phase].name)}</b><p>${esc(change.why)}</p></div>`
        : change ? `<div class="phase-change"><small>EVOLUÇÃO</small><p>${esc(change.why)}</p></div>`
        : `<b>Anotado!</b><small class="muted">Seu próximo treino já foi ajustado.</small>`;
    }
  }, { onClose: () => { if (w.plan && !answered) afterPlanWorkout(w, 0); } });
}
