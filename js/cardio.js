// Treinador de cardio: corrida e pedal com progressão própria.
// Corrida para quem está voltando: corre-caminha em estágios até 30 min contínuos.
// Com base formada: treinos leves (zona 2), intervalados e longos, crescendo ~10% por semana.
import { state, save } from './store.js';
import { fmtPace } from './util.js';

export const CARDIO_CHOICES = { nao: 'Só musculação', corrida: 'Corrida', pedal: 'Pedal', ambos: 'Corrida e pedal' };

// Corre-caminha: [minutos correndo, minutos caminhando, repetições]
const STAGES = [[1, 1.5, 8], [1.5, 2, 7], [2, 2, 6], [3, 1.5, 5], [5, 2, 4], [8, 2, 3], [12, 2, 2], [20, 0, 1], [30, 0, 1]];
// Intervalados: [repetições, minutos de esforço]
const RUN_IV = [[4, 2], [5, 2], [6, 2], [4, 3], [5, 3], [6, 3], [4, 4], [5, 4], [4, 5], [5, 5]];
const BIKE_IV = [[4, 3], [5, 3], [4, 4], [5, 4], [4, 5], [5, 5], [4, 6], [5, 6]];

const TYPES = { 1: ['longo', 'leve'], 2: ['intervalado', 'longo'], 3: ['leve', 'intervalado', 'longo'] };
const TYPE_NAME = {
  corrida: { leve: 'leve · zona 2', intervalado: 'intervalada', longo: 'longa', caminha: 'corre-caminha' },
  pedal: { leve: 'leve · zona 2', intervalado: 'intervalado', longo: 'longo' }
};

export function initCardio(plan, p) {
  const returning = ['3m', '6m', 'mais'].includes(p.breakTime) || p.level === 'iniciante';
  plan.run = { base: !returning, stage: 0, ok: 0, easy: returning ? 25 : 30, long: 45, iv: 0, n: 0 };
  plan.bike = { easy: returning ? 35 : 45, long: returning ? 60 : 75, iv: 0, n: 0 };
  plan.cidx = 0;
}

const modeFor = (p, plan) => p.cardio === 'ambos' ? (plan.cidx % 2 ? 'pedal' : 'corrida') : p.cardio;

// Ritmo médio das últimas corridas leves (min/km), para orientar os tiros
function recentEasyPace() {
  const paces = state.workouts.filter(w => w.plan?.kind === 'cardio' && w.plan.type === 'leve' && w.plan.mode === 'corrida')
    .slice(-4).flatMap(w => w.km ? [w.exercises.reduce((m, e) => m + e.sets.reduce((n, s) => n + (s.min || 0), 0), 0) / w.km]
      : w.exercises.flatMap(e => e.sets.filter(s => s.km && s.min).map(s => s.min / s.km)));
  return paces.length ? paces.reduce((a, b) => a + b, 0) / paces.length : null;
}

const C = (exId, n, min, rest = 0, tip = '') => ({ exId, rest, tip, rx: { quality: 'cardio' }, slot: { role: 'acc', p: 'cardio' }, group: null, tech: null, notes: '', sets: Array.from({ length: n }, () => ({ type: 'n', min })) });

export function cardioSession(plan, p, phase) {
  const mode = modeFor(p, plan);
  const prog = mode === 'pedal' ? plan.bike : plan.run;
  const types = TYPES[Math.min(3, p.cardioDays || 2)];
  let type = types[prog.n % types.length];
  const light = phase === 'deload' || phase === 'readapt';
  if (light && type === 'intervalado') type = 'leve';
  const f = phase === 'deload' ? 0.7 : phase === 'readapt' ? 0.8 : 1;
  const reasons = [], exercises = [];
  const exId = mode === 'pedal' ? 'pedal' : 'corrida';

  if (mode === 'corrida' && !prog.base) {
    const [run, walk, reps] = STAGES[Math.min(prog.stage, STAGES.length - 1)];
    type = 'caminha';
    exercises.push(C('caminhada', 1, 5, 0, 'Aquecimento: caminhada rápida.'));
    exercises.push(C('corrida', reps, run, walk * 60, walk ? `Corra ${run} min em ritmo leve e caminhe ${walk} min no descanso. Use o botão ▶ para cronometrar.` : 'Corrida contínua em ritmo de conversa.'));
    exercises.push(C('caminhada', 1, 5, 0, 'Volta à calma.'));
    reasons.push(`Estágio ${prog.stage + 1} de ${STAGES.length} do corre-caminha. Dois treinos tranquilos seguidos e você avança.`);
  } else if (type === 'intervalado') {
    const [reps, work] = (mode === 'pedal' ? BIKE_IV : RUN_IV)[Math.min(prog.iv, (mode === 'pedal' ? BIKE_IV : RUN_IV).length - 1)];
    const rec = mode === 'pedal' ? 180 : 120;
    exercises.push(C(exId, 1, 10, 0, 'Aquecimento bem leve.'));
    exercises.push(C(exId, reps, work, rec, `${reps} tiros de ${work} min em ritmo forte (difícil falar frases). ${rec / 60} min bem leve entre eles.`));
    exercises.push(C(exId, 1, mode === 'pedal' ? 10 : 5, 0, 'Desaquecimento leve.'));
    const pace = mode === 'corrida' ? recentEasyPace() : null;
    if (pace) reasons.push(`Seu ritmo leve recente é ${fmtPace(1, pace)}. Nos tiros, mire em torno de ${fmtPace(1, Math.max(3, pace - 0.75))}.`);
    if (mode === 'pedal') reasons.push('Nos tiros, cadência alta (85–95 rpm) e esforço 8 de 10.');
  } else {
    const min = Math.round((type === 'longo' ? prog.long : prog.easy) * f);
    exercises.push(C(exId, 1, min, 0, type === 'longo'
      ? 'Longão: bem leve, o objetivo é tempo em movimento, não velocidade.'
      : 'Zona 2: ritmo em que dá para conversar. Constrói a base aeróbica.'));
    if (mode === 'corrida' && type === 'leve') { const pace = recentEasyPace(); if (pace) reasons.push(`Seu ritmo leve recente: ${fmtPace(1, pace)}. Se a respiração apertar, diminua.`); }
  }
  if (phase === 'deload') reasons.unshift('Semana de descarga: cardio ~30% mais curto e sem tiros.');
  if (phase === 'readapt' && type !== 'caminha') reasons.unshift('Readaptação: cardio só leve por enquanto.');
  reasons.push('Anote a distância no fim: o app calcula o ritmo e acompanha sua evolução.');
  const label = mode === 'pedal' ? 'Pedal' : 'Corrida';
  return { kind: 'cardio', mode, type, name: `${label} ${TYPE_NAME[mode][type]}`, exercises, reasons };
}

// Progressão após um treino de cardio do plano
export function afterCardio(w, fb) {
  const plan = state.plan;
  const prog = w.plan.mode === 'pedal' ? plan.bike : plan.run;
  const good = fb > 0 && fb <= 2, hard = fb === 4;
  prog.n++;
  plan.cidx++;
  let msg = null;
  if (w.plan.type === 'caminha') {
    if (good) prog.ok++;
    if (hard) { prog.stage = Math.max(0, prog.stage - 1); prog.ok = 0; msg = 'Pegou pesado: no próximo, voltamos um estágio.'; }
    if (prog.ok >= 2) {
      prog.stage++; prog.ok = 0;
      if (prog.stage >= STAGES.length) { prog.base = true; msg = 'Você já corre 30 min sem parar! Agora entram treinos leves, intervalados e longos.'; }
      else msg = `Próximo estágio: ${STAGES[prog.stage][0]} min correndo por vez.`;
    }
  } else if (w.plan.type === 'intervalado') {
    if (good) prog.iv++;
    if (hard) prog.iv = Math.max(0, prog.iv - 1);
  } else {
    const key = w.plan.type === 'longo' ? 'long' : 'easy';
    const cap = w.plan.mode === 'pedal' ? (key === 'long' ? 180 : 90) : (key === 'long' ? 100 : 60);
    if (good) prog[key] = Math.min(cap, Math.round(prog[key] * 1.05));
    if (hard) prog[key] = Math.round(prog[key] * 0.9);
  }
  save();
  return msg;
}
