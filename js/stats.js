import { state, getEx } from './store.js';
import { startOfWeek, DAY } from './util.js';

// 1RM estimado (Epley), só faz sentido até ~12 repetições
export const e1rm = (kg, reps) => (kg && reps) ? (reps === 1 ? kg : kg * (1 + Math.min(reps, 12) / 30)) : 0;

export const countsForStats = s => s.done !== false && s.type !== 'w';

export function setVolume(s, type) {
  return type === 'peso' && countsForStats(s) ? (s.kg || 0) * (s.reps || 0) : 0;
}

export function workoutVolume(w) {
  let v = 0;
  for (const e of w.exercises) { const t = getEx(e.exId).type; for (const s of e.sets) v += setVolume(s, t); }
  return v;
}

export const workoutSets = w => w.exercises.reduce((n, e) => n + e.sets.filter(s => s.done !== false).length, 0);

export function workoutKm(w) {
  let km = 0;
  for (const e of w.exercises) if (getEx(e.exId).type === 'cardio') for (const s of e.sets) if (s.done !== false) km += s.km || 0;
  return km;
}

// Sessões em que o exercício aparece, mais recente primeiro
export function exerciseSessions(exId) {
  return state.workouts
    .map(w => ({ w, e: w.exercises.find(x => x.exId === exId) }))
    .filter(x => x.e)
    .sort((a, b) => b.w.start - a.w.start);
}

export function sessionBest(sets, type) {
  const ok = sets.filter(countsForStats);
  const r = { kg: 0, e1rm: 0, volume: 0, reps: 0, sec: 0, km: 0, min: 0, pace: 0 };
  for (const s of ok) {
    r.kg = Math.max(r.kg, s.kg || 0);
    r.e1rm = Math.max(r.e1rm, e1rm(s.kg, s.reps));
    r.volume += type === 'peso' ? (s.kg || 0) * (s.reps || 0) : 0;
    r.reps = Math.max(r.reps, s.reps || 0);
    r.sec = Math.max(r.sec, s.sec || 0);
    r.km += s.km || 0;
    r.min += s.min || 0;
  }
  if (r.km && r.min) r.pace = r.min / r.km;
  return r;
}

export function records(exId, skipId = null) {
  const type = getEx(exId).type;
  const r = { kg: 0, e1rm: 0, volume: 0, reps: 0, sec: 0, km: 0, pace: 0 };
  for (const { w, e } of exerciseSessions(exId)) {
    if (w.id === skipId) continue;
    const b = sessionBest(e.sets, type);
    for (const k of ['kg', 'e1rm', 'volume', 'reps', 'sec', 'km']) r[k] = Math.max(r[k], b[k]);
    if (b.pace && (!r.pace || b.pace < r.pace)) r.pace = b.pace;
  }
  return r;
}

// Recordes batidos num treino, comparando com tudo que veio antes dele
export function newRecords(w) {
  const out = [];
  for (const e of w.exercises) {
    const ex = getEx(e.exId);
    const prev = records(e.exId, w.id);
    const had = exerciseSessions(e.exId).some(x => x.w.id !== w.id && x.w.start < w.start);
    if (!had) continue;
    const b = sessionBest(e.sets, ex.type);
    if (ex.type === 'peso') {
      if (b.kg > prev.kg) out.push({ ex, label: 'Maior carga' });
      else if (b.e1rm > prev.e1rm) out.push({ ex, label: 'Melhor 1RM estimado' });
      if (b.volume > prev.volume) out.push({ ex, label: 'Maior volume' });
    } else if (ex.type === 'corpo' && b.reps > prev.reps) out.push({ ex, label: 'Mais repetições' });
    else if (ex.type === 'tempo' && b.sec > prev.sec) out.push({ ex, label: 'Maior tempo' });
    else if (ex.type === 'cardio') {
      if (b.km > prev.km) out.push({ ex, label: 'Maior distância' });
      if (b.pace && prev.pace && b.pace < prev.pace) out.push({ ex, label: 'Melhor ritmo' });
    }
  }
  return out;
}

export function weekly(n = 12) {
  const now = startOfWeek(Date.now());
  const weeks = Array.from({ length: n }, (_, i) => ({ start: now - (n - 1 - i) * 7 * DAY, count: 0, volume: 0, minutes: 0 }));
  for (const w of state.workouts) {
    const i = Math.round((startOfWeek(w.start) - weeks[0].start) / (7 * DAY));
    if (i < 0 || i >= n) continue;
    weeks[i].count++;
    weeks[i].volume += workoutVolume(w);
    weeks[i].minutes += Math.round(((w.end || w.start) - w.start) / 60e3);
  }
  return weeks;
}

// Semanas seguidas com pelo menos um treino (a semana atual ainda vale se estiver vazia)
export function weekStreak() {
  const set = new Set(state.workouts.map(w => startOfWeek(w.start)));
  let wk = startOfWeek(Date.now()), n = 0;
  if (!set.has(wk)) wk -= 7 * DAY;
  while (set.has(wk)) { n++; wk -= 7 * DAY; }
  return n;
}

export function muscleSplit(days = 30) {
  const since = Date.now() - days * DAY, m = {};
  for (const w of state.workouts) {
    if (w.start < since) continue;
    for (const e of w.exercises) {
      const k = getEx(e.exId).muscle;
      m[k] = (m[k] || 0) + e.sets.filter(countsForStats).length;
    }
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
