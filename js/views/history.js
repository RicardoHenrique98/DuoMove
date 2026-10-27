import { state, save, getEx, sortedWorkouts } from '../store.js';
import { MUSCLES } from '../data.js';
import { esc, fmtDate, fmtDuration, fmtKg, fmtPace, fmtNum, plural } from '../util.js';
import { icon, menu, confirmBox, toast } from '../ui.js';
import { go, back } from '../router.js';
import { repeatWorkout, editWorkout, routineFromWorkout } from '../workout.js';
import { workoutVolume, workoutSets, workoutKm, newRecords } from '../stats.js';
import { workoutCard } from './home.js';
import { fmtSet, setTag } from './live.js';

export function render() {
  const list = sortedWorkouts();
  if (!list.length) return `<div class="page-head"><div><div class="eyebrow">Seus treinos</div><h1>Histórico</h1></div></div>
    <div class="empty big">${icon('clock', 34)}<b>Nenhum treino ainda</b><span>Quando você finalizar um treino, ele aparece aqui.</span></div>`;
  let month = '', html = '';
  for (const w of list) {
    const m = fmtDate(w.start, { month: 'long', year: 'numeric' });
    if (m !== month) {
      month = m;
      const n = list.filter(x => fmtDate(x.start, { month: 'long', year: 'numeric' }) === m).length;
      html += `<div class="month"><b>${esc(m)}</b><small>${plural(n, 'treino', 'treinos')}</small></div>`;
    }
    html += workoutCard(w);
  }
  return `<div class="page-head"><div><div class="eyebrow">Seus treinos</div><h1>Histórico</h1></div><span class="pill">${plural(list.length, 'treino', 'treinos')}</span></div>${html}`;
}

export const actions = { openWorkout: el => go('/historico/' + el.dataset.id) };

export const detail = {
  hideTabs: true,
  render([id]) {
    const w = state.workouts.find(x => x.id === id);
    if (!w) { setTimeout(() => go('/historico', { replace: true })); return ''; }
    const recs = newRecords(w), km = workoutKm(w);
    return `<header class="live-head"><button class="icon-btn" data-act="back" aria-label="Voltar">${icon('back')}</button>
        <b class="grow center">Treino</b><button class="icon-btn" data-act="more" data-id="${w.id}" aria-label="Opções">${icon('more')}</button></header>
      <h1 class="detail-title">${esc(w.name)}</h1>
      <p class="muted">${fmtDate(w.start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      <div class="summary-grid"><div><small>Duração</small><b>${fmtDuration((w.end || w.start) - w.start)}</b></div>
        ${km ? `<div><small>Distância</small><b>${fmtNum(km, 2)} km</b></div>` : `<div><small>Volume</small><b>${fmtKg(workoutVolume(w))}</b></div>`}
        <div><small>Séries</small><b>${workoutSets(w)}</b></div></div>
      ${recs.length ? `<div class="records">${recs.map(x => `<div class="rec-line">${icon('trophy', 14)}<b>${esc(x.ex.name)}</b><span>${esc(x.label)}</span></div>`).join('')}</div>` : ''}
      ${w.exercises.map(e => {
        const ex = getEx(e.exId); let n = 0;
        const total = ex.type === 'cardio' ? e.sets.reduce((a, s) => ({ km: a.km + (s.km || 0), min: a.min + (s.min || 0) }), { km: 0, min: 0 }) : null;
        return `<article class="card ex-done"><button class="ex-title" data-act="exercise" data-ex="${ex.id}"><b>${esc(ex.name)}</b><small>${esc(MUSCLES[ex.muscle] || '')}</small></button>
          ${e.notes ? `<p class="muted small">“${esc(e.notes)}”</p>` : ''}
          ${e.sets.map(s => { if (s.type !== 'w') n++; return `<div class="done-set"><span class="set-tag t-${s.type}">${setTag(s, n)}</span><span>${esc(fmtSet(s, ex.type))}</span></div>`; }).join('')}
          ${total && total.km ? `<small class="muted">Ritmo médio ${fmtPace(total.km, total.min)}</small>` : ''}</article>`;
      }).join('')}
      <button class="btn primary block" data-act="repeat" data-id="${w.id}">${icon('play', 16)} Repetir este treino</button>`;
  },
  actions: {
    back: () => back('/historico'),
    exercise: el => go('/exercicio/' + el.dataset.ex),
    repeat: el => repeatWorkout(state.workouts.find(x => x.id === el.dataset.id)),
    async more(el) {
      const w = state.workouts.find(x => x.id === el.dataset.id);
      const v = await menu(w.name, [
        { label: 'Editar treino', value: 'edit', icon: 'edit' },
        { label: 'Salvar como rotina', value: 'routine', icon: 'copy' },
        { label: 'Excluir treino', value: 'del', icon: 'trash', danger: true }]);
      if (v === 'edit') editWorkout(w);
      if (v === 'routine') { state.routines.unshift(routineFromWorkout(w)); save(); toast('Rotina criada'); }
      if (v === 'del' && await confirmBox('Excluir treino?', 'Ele sai do histórico e das estatísticas.', 'Excluir', true)) {
        state.workouts = state.workouts.filter(x => x !== w); save(); go('/historico', { replace: true }); toast('Treino excluído');
      }
    }
  }
};
