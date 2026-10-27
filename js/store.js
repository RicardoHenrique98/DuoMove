import { EXERCISES, PRESET_ROUTINES, PRESETS_VERSION, OLD_PRESET_NAMES } from './data.js';
import { uid, num, norm } from './util.js';

const KEY = 'duo-move-v2';
const OLD_KEY = 'duo-move-trainer-v1';

const LIBRARY = new Map(EXERCISES.map(e => [e.id, e]));

export function routineFromPreset(p) {
  return {
    id: uid(), name: p.name, kind: p.kind, program: p.program, preset: true, created: Date.now(),
    exercises: p.ex.map(e => ({ id: uid(), exId: e.exId, rest: e.rest, notes: e.notes || '', sets: e.sets.map(s => ({ ...s })) }))
  };
}

// Troca as fichas prontas antigas pelas novas, mantendo as rotinas criadas pelo usuário
function upgradePresets(s) {
  if ((s.presetsV || 1) >= PRESETS_VERSION) return;
  const mine = s.routines.filter(r => !r.preset && !OLD_PRESET_NAMES.includes(r.name));
  s.routines = [...PRESET_ROUTINES.map(routineFromPreset), ...mine];
  s.presetsV = PRESETS_VERSION;
}

function fresh() {
  return {
    v: 2,
    presetsV: PRESETS_VERSION,
    profile: { name: '', goal: 'Ganhar força', rest: 90, sound: true },
    routines: PRESET_ROUTINES.map(routineFromPreset),
    workouts: [],
    custom: [],
    active: null
  };
}

// Converte o diário da versão anterior (chave "data|modalidade|exercício") em treinos
function migrateOld(raw, s) {
  try {
    const old = JSON.parse(raw);
    if (old.name) s.profile.name = old.name;
    if (old.goal) s.profile.goal = old.goal;
    const byDay = {};
    for (const [key, sets] of Object.entries(old.trainingLog || {})) {
      const [date, type, name] = key.split('|');
      const done = (sets || []).filter(x => num(x.reps) != null);
      if (!date || !name || !done.length) continue;
      let ex = EXERCISES.find(e => norm(e.name).startsWith(norm(name)) || norm(name).startsWith(norm(e.name).split(' (')[0]));
      if (!ex) {
        ex = s.custom.find(e => norm(e.name) === norm(name));
        if (!ex) { ex = { id: 'c-' + uid(), name, muscle: 'corpo', equip: 'nenhum', type: 'peso', custom: true }; s.custom.push(ex); }
      }
      const k = date + '|' + type;
      const start = new Date(date + 'T12:00:00').getTime();
      byDay[k] ||= { id: uid(), name: type || 'Treino', start, end: start + 45 * 60e3, notes: '', exercises: [] };
      byDay[k].exercises.push({ id: uid(), exId: ex.id, rest: 90, notes: '', sets: done.map(x => ({ type: 'n', kg: num(x.load), reps: num(x.reps), done: true })) });
    }
    s.workouts.push(...Object.values(byDay));
  } catch { /* dados antigos ilegíveis: ignora */ }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = { ...fresh(), presetsV: 1, ...JSON.parse(raw) };
      upgradePresets(s);
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const s = fresh();
    const old = localStorage.getItem(OLD_KEY);
    if (old) migrateOld(old, s);
    return s;
  } catch {
    return fresh();
  }
}

export let state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* armazenamento cheio ou bloqueado */ }
}

export function replaceState(next) {
  state = { ...fresh(), ...next };
  save();
}

export function resetState() {
  state = fresh();
  save();
}

export function exportData() {
  return JSON.stringify({ app: 'duo-move', exported: new Date().toISOString(), ...state }, null, 1);
}

export const allExercises = () => [...EXERCISES, ...state.custom];

export const getEx = id => LIBRARY.get(id) || state.custom.find(e => e.id === id) || { id, name: 'Exercício removido', muscle: 'corpo', equip: 'nenhum', type: 'peso' };

export function addCustomExercise(data) {
  const ex = { id: 'c-' + uid(), custom: true, ...data };
  state.custom.push(ex);
  save();
  return ex;
}

export const sortedWorkouts = () => [...state.workouts].sort((a, b) => b.start - a.start);

// Séries da última vez que o exercício foi feito (para a coluna "Anterior")
export function previousSets(exId, beforeTs = Infinity, skipId = null) {
  let best = null;
  for (const w of state.workouts) {
    if (w.id === skipId || w.start >= beforeTs) continue;
    const e = w.exercises.find(x => x.exId === exId);
    if (e && (!best || w.start > best.start)) best = { start: w.start, sets: e.sets };
  }
  return best ? best.sets : [];
}

// Pede ao navegador para não apagar os dados automaticamente (importante no iPhone)
navigator.storage?.persist?.().catch(() => {});
