// Plano de prova de corrida: semanas contadas até a data da prova, com fases (base, construção,
// pico, polimento), semana leve a cada 4, treinos de qualidade variados e ritmos-alvo tirados
// do tempo de 5 km. Os ritmos se ajustam sozinhos pela distância total que a pessoa anota.
import { state } from './store.js';
import { DAY, startOfWeek } from './util.js';

export const RACES = { 5: ['5 km', 5], 10: ['10 km', 10], 21: ['Meia maratona', 21.1], 42: ['Maratona', 42.2] };
// Tempo recente de 5 km (minutos; 0 = não sabe)
export const FIVE_K = { 23: 'Até 25 min', 27.5: '25 a 30 min', 32.5: '30 a 35 min', 37.5: '35 a 40 min', 45: 'Mais de 40 min', 0: 'Não sei / nunca corri 5 km' };
const TAPER = { 5: 1, 10: 1, 21: 2, 42: 3 };
const PEAK_LONG = { 5: 60, 10: 75, 21: 120, 42: 170 };
const MIN_WEEKS = { 5: 4, 10: 6, 21: 10, 42: 14 };
const QUALITY = {
  base: ['fartlek', 'subida', 'progressivo'],
  construcao: ['tempo', 'tiros', 'fartlek', 'subida'],
  pico: ['tiros', 'tempo', 'prova'],
  polimento: ['prova', 'tiros']
};
export const RACE_PHASES = {
  base: ['Base', 'Volume leve e estímulos curtos de velocidade.'],
  construcao: ['Construção', 'Entram os treinos de limiar (tempo) e os tiros.'],
  pico: ['Pico', 'Treinos mais específicos, no ritmo da prova.'],
  recuperacao: ['Semana leve', 'Menos volume para o corpo absorver o treino.'],
  polimento: ['Polimento', 'Volume cai para você chegar descansado.'],
  prova: ['Semana da prova', 'Só ativação. Descanse e confie no treino.']
};

// "5:42/km"
export const pace = p => { const s = Math.round(p * 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}/km`; };
const range = ([a, b]) => `${pace(a).replace('/km', '')}–${pace(b)}`;

// Ritmos (min/km) a partir do ritmo de 5 km; prova pela fórmula de Riegel
export function zones(r) {
  const p5 = r.p5;
  if (!p5) return null;
  const d = RACES[r.dist][1], racePace = p5 * 5 * (d / 5) ** 1.06 / 5 / (d / 5);
  return { leve: [p5 * 1.25, p5 * 1.38], longo: [p5 * 1.28, p5 * 1.42], tempo: [p5 * 1.06, p5 * 1.1], tiros: [p5 * 0.97, p5 * 1.02], prova: [racePace * 0.99, racePace * 1.01], racePace };
}
export const zoneText = (r, z) => { const Z = zones(r); return Z ? `Ritmo-alvo: ${range(Z[z])}.` : ''; };

export function initRace(plan, p, easyPace) {
  if (!['corrida', 'ambos'].includes(p.cardio) || !RACES[p.race] || !p.raceDate) { delete plan.race; return; }
  const p5 = +p.raceTime ? +p.raceTime / 5 : easyPace ? easyPace / 1.3 : null;
  plan.race = { dist: +p.race, date: new Date(p.raceDate + 'T12:00').getTime(), start: startOfWeek(Date.now()), p5, q: 0, tempo: 15, trend: 0 };
}

// Onde a pessoa está no plano da prova
export function raceStatus(r) {
  const today = new Date().setHours(0, 0, 0, 0);
  const weeksLeft = Math.ceil((r.date - today) / (7 * DAY));
  const total = Math.max(1, Math.round((r.date - r.start) / (7 * DAY)));
  const week = Math.min(total, Math.floor((Date.now() - r.start) / (7 * DAY)) + 1);
  const taper = TAPER[r.dist], build = Math.max(1, total - taper);
  let phase;
  if (weeksLeft <= 1) phase = 'prova';
  else if (weeksLeft <= taper + 1) phase = 'polimento';
  else if (week % 4 === 0) phase = 'recuperacao';
  else if (week <= build * 0.4) phase = 'base';
  else if (week <= build - 2) phase = 'construcao';
  else phase = 'pico';
  return { weeksLeft, total, week, phase, daysLeft: Math.round((r.date - today) / DAY), short: total < MIN_WEEKS[r.dist], name: RACES[r.dist][0] };
}

const C = (exId, n, min, rest = 0, tip = '') => ({ exId, rest, tip, rx: { quality: 'cardio' }, slot: { role: 'acc', p: 'cardio' }, group: null, tech: null, notes: '', sets: Array.from({ length: n }, () => ({ type: 'n', min })) });

// Treino de corrida do plano da prova. prog = plan.run (mesma progressão de leve/longo/tiros)
export function raceSession(plan, p, prog, ivTable) {
  const r = plan.race, st = raceStatus(r), Z = zones(r);
  const done = state.workouts.filter(w => w.plan?.race && w.start >= startOfWeek(Date.now())).length;
  const slots = { 1: ['longo'], 2: ['qualidade', 'longo'], 3: ['leve', 'qualidade', 'longo'] }[Math.min(3, p.cardioDays || 2)];
  let slot = slots[done % slots.length];
  const reasons = [`${st.name} em ${st.daysLeft} dias · semana ${st.week} de ${st.total} · ${RACE_PHASES[st.phase][0]}: ${RACE_PHASES[st.phase][1]}`];
  if (st.short && st.week === 1) reasons.push('O prazo é curto para essa distância: o foco é chegar inteiro, sem forçar o ritmo.');
  if (!Z) reasons.push('Ainda sem tempo de 5 km: use o esforço (leve = dá para conversar; forte = só frases curtas). Depois de algumas corridas com a distância anotada, o app calcula seus ritmos.');
  const ex = [], km = [];
  const add = (exId, n, min, rest, tip, z) => { ex.push(C(exId, n, min, rest, tip)); if (Z) km.push(n * min / Z[z][1] + n * rest / 60 / (Z.leve[1] * 1.15)); };

  // Dia da prova e véspera
  if (st.daysLeft <= 0) {
    const t = Z ? Math.round(Z.racePace * RACES[r.dist][1]) : Math.round(RACES[r.dist][1] * 7);
    add('corrida', 1, t, 0, `Dia da prova! Saia um pouco abaixo do ritmo e acelere no fim. ${Z ? `Ritmo de prova: ${pace(Z.racePace)}.` : ''}`, 'prova');
    return { type: 'dia', name: `Prova: ${st.name}`, exercises: ex, reasons: ['Hoje é o dia. Hidrate-se, aqueça 10 min caminhando e trotando, e aproveite.'], expKm: RACES[r.dist][1] };
  }
  if (st.phase === 'prova' && slots.length > 1 && done === 0) {
    add('corrida', 1, 25, 0, `Rodagem leve e curta. ${zoneText(r, 'leve')}`, 'leve');
    return { type: 'leve', name: 'Corrida leve', exercises: ex, reasons: [...reasons, 'Semana da prova: pouco volume, só para manter o ritmo.'], expKm: round(sum(km)) };
  }
  if (st.phase === 'prova') {
    add('corrida', 1, 20, 0, `Trote leve. ${zoneText(r, 'leve')}`, 'leve');
    add('corrida', 4, 0.33, 60, 'Acelerações de 20 s, soltas, quase no ritmo de prova. Caminhe 1 min entre elas.', 'tiros');
    return { type: 'ativacao', name: 'Corrida de ativação', exercises: ex, reasons: [...reasons, 'Último treino antes da prova: curto, para as pernas chegarem acordadas. Depois, descanso.'], expKm: round(sum(km)) };
  }

  // Polimento: o volume cai semana a semana até a prova
  const light = st.phase === 'recuperacao', taperF = st.phase !== 'polimento' ? 1 : TAPER[r.dist] === 1 ? 0.6 : 0.45 + 0.15 * (st.weeksLeft - 2);
  if (slot === 'qualidade' && light) slot = 'leve';
  let type = slot, name;
  if (slot === 'longo') {
    const peak = PEAK_LONG[r.dist], start = Math.min(prog.long, peak);
    const build = Math.max(1, st.total - TAPER[r.dist] - 1);
    let min = Math.min(start + (peak - start) * Math.min(1, (st.week - 1) / build), start * 1.1 ** (st.week - 1));
    if (light) min *= 0.75;
    min = Math.round(min * taperF / 5) * 5;
    const fast = st.phase === 'pico' && r.dist >= 21;
    add('corrida', 1, fast ? min - 15 : min, 0, `Longão: leve e constante. ${zoneText(r, 'longo')}`, 'longo');
    if (fast) add('corrida', 1, 15, 0, `Últimos 15 min no ritmo da prova. ${zoneText(r, 'prova')}`, 'prova');
    name = 'Longão';
  } else if (slot === 'leve') {
    add('corrida', 1, Math.round(prog.easy * (light ? 0.8 : taperF)), 0, `Rodagem leve, dá para conversar. ${zoneText(r, 'leve')}`, 'leve');
    name = 'Corrida leve';
  } else {
    const list = QUALITY[st.phase];
    type = list[r.q % list.length];
    add('corrida', 1, 10, 0, `Aquecimento: trote leve. ${zoneText(r, 'leve')}`, 'leve');
    if (type === 'tiros') {
      const [reps, work] = ivTable[Math.min(prog.iv, ivTable.length - 1)], n = Math.max(3, Math.round(reps * taperF));
      add('corrida', n, work, 120, `${n} tiros de ${work} min fortes, 2 min de trote entre eles. ${zoneText(r, 'tiros')}`, 'tiros');
      name = 'Tiros';
    } else if (type === 'tempo') {
      const t = Math.round(r.tempo * taperF), n = t > 20 ? 2 : 1;
      add('corrida', n, Math.round(t / n), 120, `Ritmo de limiar: forte mas controlado, dá para falar só palavras soltas. ${zoneText(r, 'tempo')}`, 'tempo');
      name = 'Tempo run';
    } else if (type === 'fartlek') {
      add('corrida', 8, 1, 90, `Fartlek: 1 min rápido e 1 min e meio leve, 8 vezes. ${zoneText(r, 'tiros')}`, 'tiros');
      name = 'Fartlek';
    } else if (type === 'subida') {
      add('corrida', 8, 0.75, 90, 'Tiros de 45 s numa subida (ou esteira inclinada a 6%), descendo caminhando. Força e técnica de corrida.', 'tempo');
      name = 'Subidas';
    } else if (type === 'progressivo') {
      add('corrida', 1, 15, 0, `Comece leve. ${zoneText(r, 'leve')}`, 'leve');
      add('corrida', 1, 10, 0, `Termine forte, no ritmo de limiar. ${zoneText(r, 'tempo')}`, 'tempo');
      name = 'Progressivo';
    } else {
      const n = r.dist >= 21 ? 3 : 4, m = r.dist >= 21 ? 10 : 5;
      add('corrida', Math.max(2, Math.round(n * taperF)), m, 120, `Blocos no ritmo da prova, para o corpo decorar. ${zoneText(r, 'prova')}`, 'prova');
      name = 'Ritmo de prova';
    }
    add('corrida', 1, 5, 0, 'Desaquecimento: trote ou caminhada.', 'leve');
  }
  reasons.push('No fim, anote a distância total: o treinador compara com o esperado e ajusta seus ritmos.');
  return { type, name, exercises: ex, reasons, expKm: Z ? round(sum(km)) : null };
}
const sum = a => a.reduce((x, y) => x + y, 0), round = x => x ? Math.round(x * 100) / 100 : null;

// Depois de um treino da prova: avança a variedade, progride o tempo e ajusta os ritmos
export function afterRace(r, w, fb) {
  if (w.plan.type === 'dia') { r.done = true; return `Prova concluída! Parabéns. Monte um novo plano quando quiser a próxima.`; }
  if (['fartlek', 'subida', 'progressivo', 'tiros', 'tempo', 'prova'].includes(w.plan.type)) r.q++;
  if (w.plan.type === 'tempo' && fb > 0 && fb <= 2) r.tempo = Math.min(r.dist >= 21 ? 40 : 30, r.tempo + 3);
  if (!w.km) return null;
  const min = w.exercises.reduce((m, e) => m + e.sets.reduce((n, s) => n + (s.min || 0), 0), 0);
  // Sem tempo de 5 km: o ritmo leve real vira a referência
  if (!r.p5) { if (['leve', 'longo'].includes(w.plan.type)) { r.p5 = min / w.km / 1.3; return `Ritmos calculados pela sua corrida: leve em ${pace(r.p5 * 1.3)}.`; } return null; }
  const exp = w.plan.expKm;
  if (!exp) return null;
  const ratio = w.km / exp;
  r.trend = ratio > 1.04 ? Math.max(0, r.trend) + 1 : ratio < 0.95 ? Math.min(0, r.trend) - 1 : 0;
  if (fb === 4) r.trend = Math.min(0, r.trend) - 1;
  if (r.trend >= 2) { r.p5 *= 0.985; r.trend = 0; return `Você está andando mais rápido que o previsto: ritmos ajustados (5 km em ${pace(r.p5)}).`; }
  if (r.trend <= -2) { r.p5 *= 1.015; r.trend = 0; return 'Os ritmos estavam puxados: o treinador aliviou um pouco.'; }
  return null;
}
