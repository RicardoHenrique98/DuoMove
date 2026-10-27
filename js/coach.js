// Treinador: sugere carga e repetições a partir das últimas sessões (progressão dupla).
// 1) Dentro da faixa (ex.: 8–12), some repetições mantendo a carga.
// 2) Bateu o topo da faixa em todas as séries → sobe a carga e volta para o início da faixa.
// 3) Duas sessões seguidas abaixo do mínimo → recua ~10% e reconstrói.
import { state, getEx } from './store.js';
import { exerciseSessions, e1rm } from './stats.js';
import { fmtNum } from './util.js';
import { isMain } from './techniques.js';

const LOWER = new Set(['quadriceps', 'posterior', 'gluteos', 'adutores', 'panturrilha']);

// Incremento de carga típico para cada tipo de exercício
function increment(ex) {
  if (ex.equip === 'halter' || ex.equip === 'kettlebell') return 2;
  if (LOWER.has(ex.muscle) && ex.equip !== 'polia') return 5;
  return 2.5;
}

const roundTo = (kg, step) => Math.max(step, Math.round(kg / step) * step);
const kgTxt = kg => `${fmtNum(kg, 2)} kg`;
const working = sets => sets.filter(s => isMain(s) && s.done !== false);

// Aquecimento ~50%; drop sets descem ~20% a partir da série anterior; rest-pause e cluster mantêm a carga
function mapSets(targets, count, kgFor, repFor, step) {
  const tgt = i => targets[i] || targets.at(-1) || { type: 'n' };
  let n = 0, prevKg = null;
  const firstKg = kgFor(0);
  return Array.from({ length: count }, (_, i) => {
    const t = tgt(i);
    if (t.type === 'w') return { kg: roundTo(firstKg * 0.5, step), reps: 10 };
    if (t.type === 'd') { prevKg = prevKg ? roundTo(prevKg * 0.8, 0.5) : null; return prevKg ? { kg: prevKg } : {}; }
    if (t.type === 'r' || t.type === 'c') return prevKg ? { kg: prevKg } : {};
    const k = n++;
    prevKg = kgFor(k);
    return { kg: prevKg, reps: t.reps && !t.rmax ? t.reps : repFor(k) };
  });
}

function defaultRange(reps) {
  const avg = reps.reduce((a, b) => a + b, 0) / (reps.length || 1);
  return avg <= 6 ? [4, 6] : avg <= 12 ? [8, 12] : [12, 20];
}

/**
 * targets: séries-alvo da rotina ([{type, reps, rmax, sec}]).
 * Devolve { tone: 'up'|'keep'|'down'|'new', msg, sets: [{kg, reps, sec}] } ou null.
 */
export function suggest(exId, targets = [], ctx = {}) {
  if (state.profile.coach === false) return null;
  const ex = getEx(exId);
  if (!['peso', 'corpo', 'tempo'].includes(ex.type)) return null;

  const mt = targets.filter(isMain);
  const tw = mt[0];
  const sessions = exerciseSessions(exId).filter(x => x.w.id !== state.active?.id);
  const last = sessions[0] ? working(sessions[0].e.sets) : [];

  let lo = tw?.reps, hi = tw?.rmax ?? tw?.reps;
  if (!lo && last.length) [lo, hi] = defaultRange(last.map(s => s.reps || 0));
  const range = lo && hi && hi > lo ? `${lo}–${hi}` : lo;

  if (!last.length) {
    if (ex.type !== 'peso' || !lo) return null;
    return { tone: 'new', msg: `Primeira vez: escolha uma carga que permita ${range} repetições com ${ctx.rir || '1–2'} sobrando.`, sets: [] };
  }

  if (ex.type === 'tempo') {
    const best = Math.max(...last.map(s => s.sec || 0));
    if (!best) return null;
    const sec = best + 5;
    return { tone: 'up', msg: `Última vez: ${best}s. Tente ${sec}s hoje.`, sets: Array.from({ length: targets.length || last.length }, () => ({ sec })) };
  }

  // Faixa de cada série (pirâmides têm faixas diferentes por série)
  const rangeAt = i => { const t = mt[i] || mt.at(-1); return t?.reps ? [t.reps, t.rmax ?? t.reps] : [lo, hi]; };
  const reps = last.map(s => s.reps || 0);
  const allTop = reps.every((r, i) => r >= rangeAt(i)[1]);
  const allMin = reps.every((r, i) => r >= rangeAt(i)[0]);
  const count = targets.length || last.length;
  const tgt = i => targets[i] || targets.at(-1) || { type: 'n' };

  if (ex.type === 'corpo') {
    if (allTop) return { tone: 'up', msg: `Você bateu ${hi} repetições em todas as séries. Deixe mais difícil: adicione carga, faça pausa embaixo ou use uma variação.`, sets: Array.from({ length: count }, (_, i) => isMain(tgt(i)) ? { reps: hi } : {}) };
    let n = 0;
    return { tone: 'keep', msg: 'Tente 1 repetição a mais em cada série.', sets: Array.from({ length: count }, (_, i) => { if (!isMain(tgt(i))) return {}; const k = n++; return { reps: Math.min(rangeAt(k)[1], (reps[k] ?? reps.at(-1)) + 1) }; }) };
  }

  const kgs = last.map(s => s.kg || 0);
  const kg = Math.max(...kgs);
  if (!kg) return null;
  const inc = increment(ex);
  const step = inc === 2 ? 1 : 2.5;
  const prev2 = sessions[1] ? working(sessions[1].e.sets) : [];
  const stalled = !allMin && prev2.length && prev2.some((s, i) => (s.reps || 0) < rangeAt(i)[0]) && Math.max(...prev2.map(s => s.kg || 0)) >= kg;
  const baseAt = i => kgs[i] || kgs.at(-1) || kg;

  // Semana de descarga: mesma faixa, ~10% menos carga
  if (ctx.deload) {
    const nk = roundTo(kg * 0.9, step);
    return { tone: 'down', msg: `Descarga: use ${kgTxt(nk)}, foco em técnica e velocidade. Sobre com ${ctx.rir || '4'} repetições.`, sets: mapSets(targets, count, () => nk, i => rangeAt(i)[0], step) };
  }
  // Faixa de repetições mudou muito (nova fase)? Estima a carga pelo 1RM em vez de seguir a última
  const avg = reps.reduce((x, y) => x + y, 0) / reps.length;
  if (lo && (avg > hi + 3 || avg < lo - 3)) {
    const best = Math.max(...last.map(s => e1rm(s.kg, s.reps)));
    const rir = parseInt(ctx.rir, 10) || 2;
    const nk = roundTo(best / (1 + ((lo + hi) / 2 + rir) / 30), step);
    return { tone: 'new', msg: `Faixa nova (${range} repetições): comece com ~${kgTxt(nk)} e ajuste para sobrar ${ctx.rir || '1–2'}.`, sets: mapSets(targets, count, () => nk, i => rangeAt(i)[0], step) };
  }

  let tone, msg, kgFor, repFor;
  if (allTop) {
    tone = 'up'; kgFor = i => baseAt(i) + inc; repFor = i => rangeAt(i)[0];
    msg = `Você bateu o topo da faixa em todas as séries. Suba para ${kgTxt(kg + inc)} e mire em ${range}.`;
  } else if (allMin) {
    tone = 'keep'; kgFor = baseAt; repFor = i => Math.min(rangeAt(i)[1], (reps[i] ?? reps.at(-1)) + 1);
    msg = `Mantenha ${kgTxt(kg)} e tente 1 repetição a mais por série (até ${hi}).`;
  } else if (stalled) {
    tone = 'down'; kgFor = i => roundTo(baseAt(i) * 0.9, step); repFor = i => rangeAt(i)[0];
    msg = `Duas sessões abaixo de ${lo} repetições. Recue para ${kgTxt(roundTo(kg * 0.9, step))} e reconstrua — isso faz parte da evolução.`;
  } else {
    tone = 'keep'; kgFor = baseAt; repFor = i => rangeAt(i)[0];
    msg = `Mantenha ${kgTxt(kg)} e busque pelo menos ${lo} repetições em todas as séries.`;
  }

  const sets = mapSets(targets, count, kgFor, repFor, step);
  return { tone, msg, sets };
}
