// Treinador: sugere carga e repetições a partir das últimas sessões (progressão dupla).
// 1) Dentro da faixa (ex.: 8–12), some repetições mantendo a carga.
// 2) Bateu o topo da faixa em todas as séries → sobe a carga e volta para o início da faixa.
// 3) Duas sessões seguidas abaixo do mínimo → recua ~10% e reconstrói.
import { state, getEx } from './store.js';
import { exerciseSessions } from './stats.js';
import { fmtNum } from './util.js';

const LOWER = new Set(['quadriceps', 'posterior', 'gluteos', 'adutores', 'panturrilha']);

// Incremento de carga típico para cada tipo de exercício
function increment(ex) {
  if (ex.equip === 'halter' || ex.equip === 'kettlebell') return 2;
  if (LOWER.has(ex.muscle) && ex.equip !== 'polia') return 5;
  return 2.5;
}

const roundTo = (kg, step) => Math.max(step, Math.round(kg / step) * step);
const kgTxt = kg => `${fmtNum(kg, 2)} kg`;
const working = sets => sets.filter(s => s.type !== 'w' && s.done !== false);

function defaultRange(reps) {
  const avg = reps.reduce((a, b) => a + b, 0) / (reps.length || 1);
  return avg <= 6 ? [4, 6] : avg <= 12 ? [8, 12] : [12, 20];
}

/**
 * targets: séries-alvo da rotina ([{type, reps, rmax, sec}]).
 * Devolve { tone: 'up'|'keep'|'down'|'new', msg, sets: [{kg, reps, sec}] } ou null.
 */
export function suggest(exId, targets = []) {
  if (state.profile.coach === false) return null;
  const ex = getEx(exId);
  if (!['peso', 'corpo', 'tempo'].includes(ex.type)) return null;

  const tw = targets.find(t => t.type !== 'w');
  const sessions = exerciseSessions(exId).filter(x => x.w.id !== state.active?.id);
  const last = sessions[0] ? working(sessions[0].e.sets) : [];

  let lo = tw?.reps, hi = tw?.rmax ?? tw?.reps;
  if (!lo && last.length) [lo, hi] = defaultRange(last.map(s => s.reps || 0));
  const range = lo && hi && hi > lo ? `${lo}–${hi}` : lo;

  if (!last.length) {
    if (ex.type !== 'peso' || !lo) return null;
    return { tone: 'new', msg: `Primeira vez: escolha uma carga que permita ${range} repetições com 1–2 sobrando.`, sets: [] };
  }

  const count = targets.length || last.length;
  const tgt = i => targets[i] || targets.at(-1) || { type: 'n' };

  if (ex.type === 'tempo') {
    const best = Math.max(...last.map(s => s.sec || 0));
    if (!best) return null;
    const sec = best + 5;
    return { tone: 'up', msg: `Última vez: ${best}s. Tente ${sec}s hoje.`, sets: Array.from({ length: count }, () => ({ sec })) };
  }

  const reps = last.map(s => s.reps || 0);
  const allTop = reps.every(r => r >= hi);
  const allMin = reps.every(r => r >= lo);

  if (ex.type === 'corpo') {
    if (allTop) return { tone: 'up', msg: `Você bateu ${hi} repetições em todas as séries. Deixe mais difícil: adicione carga, faça pausa embaixo ou use uma variação.`, sets: Array.from({ length: count }, () => ({ reps: hi })) };
    return { tone: 'keep', msg: 'Tente 1 repetição a mais em cada série.', sets: Array.from({ length: count }, (_, i) => ({ reps: Math.min(hi, (reps[i] ?? reps.at(-1)) + 1) })) };
  }

  const kg = Math.max(...last.map(s => s.kg || 0));
  if (!kg) return null;
  const inc = increment(ex);
  const step = inc === 2 ? 1 : 2.5;
  const prev2 = sessions[1] ? working(sessions[1].e.sets) : [];
  const stalled = !allMin && prev2.length && prev2.some(s => (s.reps || 0) < lo) && Math.max(...prev2.map(s => s.kg || 0)) >= kg;

  let tone, msg, nk, repFor;
  if (allTop) {
    nk = kg + inc; tone = 'up'; repFor = () => lo;
    msg = `Você fez ${hi}+ repetições em todas as séries. Suba para ${kgTxt(nk)} e mire em ${range}.`;
  } else if (allMin) {
    nk = kg; tone = 'keep'; repFor = i => Math.min(hi, (reps[i] ?? reps.at(-1)) + 1);
    msg = `Mantenha ${kgTxt(kg)} e tente 1 repetição a mais por série (até ${hi}).`;
  } else if (stalled) {
    nk = roundTo(kg * 0.9, step); tone = 'down'; repFor = () => lo;
    msg = `Duas sessões abaixo de ${lo} repetições. Recue para ${kgTxt(nk)} e reconstrua — isso faz parte da evolução.`;
  } else {
    nk = kg; tone = 'keep'; repFor = () => lo;
    msg = `Mantenha ${kgTxt(kg)} e busque pelo menos ${lo} repetições em todas as séries.`;
  }

  let n = 0;
  const sets = Array.from({ length: count }, (_, i) => {
    if (tgt(i).type === 'w') return { kg: roundTo(nk * 0.5, step), reps: 10 };
    return { kg: nk, reps: repFor(n++) };
  });
  return { tone, msg, sets };
}
