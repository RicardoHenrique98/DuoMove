import { state, getEx, sortedWorkouts } from '../store.js';
import { esc, fmtKg, fmtDate, fmtDuration, plural, startOfWeek } from '../util.js';
import { icon } from '../ui.js';
import { go } from '../router.js';
import { startEmpty, startFromRoutine } from '../workout.js';
import { weekly, weekStreak, workoutVolume, workoutSets } from '../stats.js';
import { todayCard, todayActions } from './plan.js';
import { openActivityLog } from './activity.js';

export function workoutCard(w) {
  const lines = w.exercises.slice(0, 3).map(e => `<li>${e.sets.length} × ${esc(getEx(e.exId).name)}</li>`).join('');
  const more = w.exercises.length > 3 ? `<li class="muted">+ ${plural(w.exercises.length - 3, 'exercício', 'exercícios')}</li>` : '';
  return `<button class="card w-card" data-act="openWorkout" data-id="${w.id}">
    <div class="row between"><b>${esc(w.name)}</b><small class="muted">${fmtDate(w.start, { weekday: 'short', day: '2-digit', month: 'short' })}</small></div>
    <div class="w-meta"><span>${icon('clock', 14)} ${fmtDuration((w.end || w.start) - w.start)}</span><span>${icon('dumbbell', 14)} ${fmtKg(workoutVolume(w))}</span><span>${icon('check', 14)} ${workoutSets(w)} séries</span></div>
    <ul class="w-lines">${lines}${more}</ul></button>`;
}

export function render() {
  const name = state.profile.name;
  const h = new Date().getHours();
  const hello = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const wk = weekly(1)[0], streak = weekStreak();
  const last = sortedWorkouts()[0];
  const days = new Set(state.workouts.filter(w => w.start >= startOfWeek(Date.now())).map(w => new Date(w.start).getDay()));
  const dayDots = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => `<span class="day ${days.has((i + 1) % 7) ? 'on' : ''} ${((new Date().getDay() + 6) % 7) === i ? 'today' : ''}">${d}</span>`).join('');
  const routines = state.routines.slice(0, 3);
  return `<div class="page-head"><div><div class="eyebrow">${fmtDate(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>${hello}${name ? ', ' + esc(name.split(' ')[0]) : ''}!</h1></div></div>
    ${todayCard()}
    <section class="card week">
      <div class="row between"><b>Sua semana</b><span class="streak">${icon('fire', 16)} ${plural(streak, 'semana seguida', 'semanas seguidas')}</span></div>
      <div class="days">${dayDots}</div>
      <div class="kpis"><div><b>${wk.count}</b><small>treinos</small></div><div><b>${fmtKg(wk.volume)}</b><small>volume</small></div><div><b>${wk.minutes}</b><small>minutos</small></div></div>
    </section>
    <div class="row gap"><button class="btn soft grow" data-act="startEmpty">${icon('plus', 18)} Treino livre</button>
      <button class="btn soft grow" data-act="logActivity">${icon('fire', 18)} Registrar atividade</button></div>
    <div class="section-head"><h2>Fichas prontas</h2><button class="link" data-act="goRoutines">Ver todas</button></div>
    ${routines.map(r => `<div class="card r-mini"><div class="grow" data-act="editRoutine" data-id="${r.id}"><b>${esc(r.name)}</b><small>${esc(r.exercises.map(e => getEx(e.exId).name).join(' · '))}</small></div>
      <button class="btn primary sm" data-act="startRoutine" data-id="${r.id}">${icon('play', 14)} Iniciar</button></div>`).join('')}
    ${last ? `<div class="section-head"><h2>Último treino</h2><button class="link" data-act="goHistory">Histórico</button></div>${workoutCard(last)}` : ''}`;
}

export const actions = {
  ...todayActions,
  startEmpty: () => startEmpty(),
  logActivity: (el, rerender) => openActivityLog(rerender),
  startRoutine: el => startFromRoutine(state.routines.find(r => r.id === el.dataset.id)),
  editRoutine: el => go('/rotina/' + el.dataset.id),
  goRoutines: () => go('/rotinas'),
  goHistory: () => go('/historico'),
  openWorkout: el => go('/historico/' + el.dataset.id)
};
