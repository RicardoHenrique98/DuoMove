// Ciclo de vida do treino em andamento (state.active)
import { state, save, getEx } from './store.js';
import { uid } from './util.js';
import { go } from './router.js';
import { confirmBox, toast } from './ui.js';

const FIELDS = ['kg', 'reps', 'sec', 'km', 'min'];
const pick = s => Object.fromEntries(FIELDS.filter(f => s[f] != null).map(f => [f, s[f]]));

export const newSet = (target = {}, type = 'n') => ({ id: uid(), type, kg: null, reps: null, sec: null, km: null, min: null, t: pick(target), done: false });

export const newExercise = (exId, sets = [{}], rest) => ({
  id: uid(), exId, notes: '',
  rest: rest ?? (getEx(exId).type === 'cardio' ? 0 : state.profile.rest),
  sets: sets.map(s => newSet(s, s.type || 'n'))
});

async function canStart() {
  if (!state.active) return true;
  const ok = await confirmBox('Treino em andamento', 'Você já tem um treino aberto. Quer descartar e começar outro?', 'Descartar e começar', true);
  if (ok) state.active = null;
  return ok;
}

function begin(w) {
  state.active = { id: uid(), start: Date.now(), restEnd: null, restTotal: 0, notes: '', ...w };
  save();
  go('/treino');
}

export async function startFromRoutine(r) {
  if (!(await canStart())) return;
  begin({ name: r.name, routineId: r.id, kind: r.kind, exercises: r.exercises.map(e => newExercise(e.exId, e.sets, e.rest)) });
}

export async function startEmpty() {
  if (!(await canStart())) return;
  const h = new Date().getHours();
  begin({ name: h < 12 ? 'Treino da manhã' : h < 18 ? 'Treino da tarde' : 'Treino da noite', exercises: [] });
}

export async function startFromExercises(name, exIds) {
  if (!(await canStart())) return;
  begin({ name, exercises: exIds.map(id => newExercise(id, [{}, {}, {}])) });
}

export async function repeatWorkout(w) {
  if (!(await canStart())) return;
  begin({ name: w.name, routineId: w.routineId, exercises: w.exercises.map(e => newExercise(e.exId, e.sets, e.rest)) });
}

// Edita um treino do histórico usando a mesma tela do treino em andamento
export async function editWorkout(w) {
  if (!(await canStart())) return;
  const copy = JSON.parse(JSON.stringify(w));
  copy.exercises.forEach(e => e.sets.forEach(s => { s.id ||= uid(); s.t ||= {}; s.done = true; }));
  state.active = { ...copy, editing: w.id, restEnd: null };
  save();
  go('/treino');
}

export function addExercisesToActive(ids) {
  for (const id of ids) state.active.exercises.push(newExercise(id, [{}, {}, {}]));
  save();
}

export function discardActive() {
  state.active = null;
  save();
}

// Salva o treino: mantém só séries concluídas. Devolve o treino salvo ou null.
export function finishActive() {
  const a = state.active;
  const exercises = a.exercises
    .map(e => ({ id: e.id, exId: e.exId, rest: e.rest, notes: e.notes, sets: e.sets.filter(s => s.done).map(s => ({ type: s.type, ...pick(s), done: true })) }))
    .filter(e => e.sets.length);
  if (!exercises.length) return null;
  const w = { id: a.editing || a.id, name: a.name.trim() || 'Treino', routineId: a.routineId || null, kind: a.kind || null, notes: a.notes || '', start: a.start, end: a.editing ? a.end : Date.now(), exercises };
  if (a.editing) state.workouts = state.workouts.map(x => x.id === a.editing ? w : x);
  else state.workouts.push(w);
  state.active = null;
  save();
  return w;
}

export function routineFromWorkout(w, name = w.name) {
  return {
    id: uid(), name, kind: w.kind || 'musculacao', created: Date.now(),
    exercises: w.exercises.map(e => ({ id: uid(), exId: e.exId, rest: e.rest, notes: '', sets: e.sets.map(s => ({ type: s.type || 'n', ...pick(s) })) }))
  };
}

export function updateRoutineFrom(w) {
  const r = state.routines.find(x => x.id === w.routineId);
  if (!r) return;
  const fresh = routineFromWorkout(w, r.name);
  r.exercises = fresh.exercises;
  save();
  toast('Rotina atualizada com este treino');
}
