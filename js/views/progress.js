import { state, getEx } from '../store.js';
import { MUSCLES, EQUIP, imgUrl } from '../data.js';
import { esc, fmtDate, fmtKg, fmtNum, fmtPace, plural } from '../util.js';
import { icon } from '../ui.js';
import { go, back } from '../router.js';
import { weekly, weekStreak, muscleSplit, workoutVolume, exerciseSessions, sessionBest, records } from '../stats.js';
import { barChart, lineChart } from '../charts.js';
import { filterExercises, exerciseRow, muscleChips } from './picker.js';
import { fmtSet, setTag } from './live.js';
import { isMain } from '../techniques.js';

let metric = 'count';

export function render() {
  const weeks = weekly(12);
  const total = state.workouts.length;
  const totalVol = state.workouts.reduce((a, w) => a + workoutVolume(w), 0);
  const split = muscleSplit(30), maxSplit = split[0]?.[1] || 1;
  const freq = {};
  for (const w of state.workouts) for (const e of w.exercises) freq[e.exId] = (freq[e.exId] || 0) + 1;
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const pts = weeks.map(w => ({ label: fmtDate(w.start, { day: '2-digit', month: '2-digit' }), value: metric === 'count' ? w.count : metric === 'volume' ? w.volume : metric === 'km' ? w.km : w.minutes }));
  const fmt = metric === 'volume' ? v => fmtKg(v) : metric === 'km' ? v => fmtNum(v, 1) + ' km' : v => fmtNum(v, 0);
  return `<div class="page-head"><div><div class="eyebrow">Constância acima de tudo</div><h1>Progresso</h1></div></div>
    <div class="kpi-cards">
      <div class="card"><small>Treinos</small><b>${total}</b></div>
      <div class="card"><small>Volume total</small><b>${fmtKg(totalVol)}</b></div>
      <div class="card"><small>Sequência</small><b>${weekStreak()} sem</b></div>
    </div>
    <section class="card">
      <div class="row between"><b>Últimas 12 semanas</b></div>
      <div class="chips">${[['count', 'Treinos'], ['volume', 'Volume'], ['minutes', 'Minutos'], ['km', 'Km']].map(([k, l]) => `<button class="chip ${metric === k ? 'on' : ''}" data-act="metric" data-k="${k}">${l}</button>`).join('')}</div>
      ${barChart(pts, fmt, 'Treinos por semana')}
    </section>
    <section class="card">
      <b>Séries por músculo · 30 dias</b>
      ${split.length ? `<div class="hbars">${split.map(([m, n]) => `<div class="hbar"><span>${esc(MUSCLES[m] || m)}</span><div><i style="width:${(n / maxSplit) * 100}%"></i></div><b>${n}</b></div>`).join('')}</div>`
        : '<div class="empty small">Treine para ver como seu volume se distribui.</div>'}
    </section>
    <div class="section-head"><h2>Seus exercícios</h2><button class="link" data-act="library">Biblioteca</button></div>
    ${top.length ? `<div class="card list">${top.map(([id, n]) => exerciseRow(getEx(id), `data-act="exercise" data-id="${id}"`, `<small class="muted">${plural(n, 'sessão', 'sessões')}</small>`)).join('')}</div>`
      : '<div class="empty">Seus exercícios mais feitos aparecem aqui.</div>'}`;
}

export const actions = {
  metric: (el, rerender) => { metric = el.dataset.k; rerender(); },
  exercise: el => go('/exercicio/' + el.dataset.id),
  library: () => go('/exercicios')
};

/* ---------- Biblioteca ---------- */

let libQ = '', libM = null;
export const library = {
  hideTabs: true,
  render() {
    const list = filterExercises(libQ, libM);
    return `<header class="live-head"><button class="icon-btn" data-act="back" aria-label="Voltar">${icon('back')}</button><b class="grow center">Biblioteca</b><span class="pill">${list.length}</span></header>
      <label class="search">${icon('search', 18)}<input type="search" placeholder="Buscar exercício" data-f="q" value="${esc(libQ)}" autocomplete="off"></label>
      ${muscleChips(libM)}
      <div class="card list" id="libList">${list.map(e => exerciseRow(e, `data-act="exercise" data-id="${e.id}"`, icon('chevron', 16))).join('')}</div>`;
  },
  input(el) {
    libQ = el.value;
    document.getElementById('libList').innerHTML = filterExercises(libQ, libM).map(e => exerciseRow(e, `data-act="exercise" data-id="${e.id}"`, icon('chevron', 16))).join('');
  },
  actions: {
    back: () => back('/progresso'),
    muscle: (el, rerender) => { libM = el.dataset.m || null; rerender(); },
    exercise: el => go('/exercicio/' + el.dataset.id)
  }
};

/* ---------- Detalhe do exercício ---------- */

let exMetric = null;
export const exercise = {
  hideTabs: true,
  render([id]) {
    const ex = getEx(id), sessions = exerciseSessions(id), rec = records(id);
    const metrics = ex.type === 'peso' ? [['kg', 'Maior carga'], ['e1rm', '1RM estimado'], ['volume', 'Volume']]
      : ex.type === 'corpo' ? [['reps', 'Repetições']] : ex.type === 'tempo' ? [['sec', 'Tempo']] : [['km', 'Distância'], ['pace', 'Ritmo (min/km)']];
    if (!metrics.some(m => m[0] === exMetric)) exMetric = metrics[0][0];
    const pts = sessions.slice(0, 20).reverse().map(({ w, e }) => ({ label: fmtDate(w.start), value: sessionBest(e.sets, ex.type)[exMetric] })).filter(p => p.value);
    const recCards = ex.type === 'peso' ? [['Maior carga', rec.kg ? fmtNum(rec.kg, 2) + ' kg' : '—'], ['1RM estimado', rec.e1rm ? fmtNum(rec.e1rm, 1) + ' kg' : '—'], ['Melhor volume', rec.volume ? fmtKg(rec.volume) : '—']]
      : ex.type === 'corpo' ? [['Mais repetições', rec.reps || '—']] : ex.type === 'tempo' ? [['Maior tempo', rec.sec ? rec.sec + 's' : '—']]
      : [['Maior distância', rec.km ? fmtNum(rec.km, 2) + ' km' : '—'], ['Melhor ritmo', rec.pace ? fmtPace(1, rec.pace) : '—']];
    const demo = ex.img ? `<div class="demo" data-act="demo" aria-label="Demonstração do exercício"><img src="${imgUrl(ex.img, 0)}" alt="${esc(ex.name)} — posição inicial" loading="lazy"><img src="${imgUrl(ex.img, 1)}" alt="${esc(ex.name)} — posição final" loading="lazy" class="b"></div>` : '';
    return `<header class="live-head"><button class="icon-btn" data-act="back" aria-label="Voltar">${icon('back')}</button><b class="grow center">Exercício</b><span></span></header>
      ${demo}
      <h1 class="detail-title">${esc(ex.name)}</h1>
      <p class="muted">${esc(MUSCLES[ex.muscle] || '')} · ${esc(EQUIP[ex.equip] || '')}</p>
      ${ex.tips?.length ? `<section class="card"><b>Como fazer</b><ol class="tips">${ex.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ol></section>` : ''}
      <div class="kpi-cards">${recCards.map(([l, v]) => `<div class="card"><small>${l}</small><b>${v}</b></div>`).join('')}</div>
      <section class="card"><div class="chips">${metrics.map(([k, l]) => `<button class="chip ${exMetric === k ? 'on' : ''}" data-act="exMetric" data-k="${k}">${l}</button>`).join('')}</div>
        ${lineChart(pts, v => exMetric === 'pace' ? fmtPace(1, v) : fmtNum(v, 1), 'Evolução')}</section>
      <div class="section-head"><h2>Histórico</h2></div>
      ${sessions.length ? sessions.slice(0, 30).map(({ w, e }) => { let n = 0; return `<button class="card ex-done" data-act="workout" data-id="${w.id}"><div class="row between"><b>${esc(w.name)}</b><small class="muted">${fmtDate(w.start, { day: '2-digit', month: 'short', year: '2-digit' })}</small></div>
        ${e.sets.map(s => { if (isMain(s)) n++; return `<div class="done-set"><span class="set-tag t-${s.type}">${setTag(s, n)}</span><span>${esc(fmtSet(s, ex.type))}</span></div>`; }).join('')}</button>`; }).join('')
        : '<div class="empty">Você ainda não fez este exercício.</div>'}`;
  },
  actions: {
    back: () => back('/progresso'),
    exMetric: (el, rerender) => { exMetric = el.dataset.k; rerender(); },
    workout: el => go('/historico/' + el.dataset.id)
  }
};
