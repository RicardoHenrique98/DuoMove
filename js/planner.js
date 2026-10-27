// Plano do treinador: monta o próximo treino sozinho a partir do perfil e dos registros.
// Fases: readaptação → hipertrofia → intensificação → descarga → (força) → novo ciclo com exercícios trocados.
// A fase avança por sessões concluídas (não por calendário) e reage a pausas, cansaço e ao feedback de cada treino.
import { state, save, getEx } from './store.js';
import { DAY, uid, startOfWeek } from './util.js';
import { initCardio, cardioSession, afterCardio } from './cardio.js';

export const LEVELS = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' };
export const BREAKS = { nao: 'Estou treinando', '1m': 'Menos de 1 mês', '3m': '1 a 3 meses', '6m': '3 a 6 meses', mais: 'Mais de 6 meses' };
export const PLACES = { academia: 'Academia completa', halteres: 'Em casa com halteres', nenhum: 'Em casa, sem equipamento' };
export const VARIETY = {
  ciclo: ['Mesma ficha durante a fase', 'Recomendado: repetir os exercícios por 4–6 semanas deixa a evolução de carga mais clara'],
  semana: ['Trocar a ficha toda semana', 'Exercícios complementares mudam a cada semana; os principais ficam'],
  sempre: ['Ficha nova a cada treino', 'Máxima variedade: complementares mudam todo treino e os principais toda semana']
};
export const FEEDBACK = [[1, 'Leve', 'Sobrou energia'], [2, 'Bom', 'Na medida'], [3, 'Pesado', 'Cansei bastante'], [4, 'Exaustivo', 'Passou do ponto']];

export const PHASES = {
  readapt: { name: 'Readaptação', rir: '3–4', color: 'blue',
    desc: 'Seu corpo está voltando a se acostumar com a carga. Exercícios estáveis, menos séries, cargas confortáveis e nenhuma técnica intensa. O objetivo é sair de cada treino querendo mais.' },
  hiper: { name: 'Hipertrofia', rir: '1–2', color: 'lime',
    desc: 'Fase de construção: volume moderado a alto, faixas de 6 a 15 repetições e progressão de carga a cada sessão. No fim da fase entra a primeira técnica: última série até a falha.' },
  intens: { name: 'Intensificação', rir: '0–1 na última série', color: 'purple',
    desc: 'Menos repetições e mais carga nos principais; técnicas como pirâmide, drop set, rest-pause e bi-sets para gerar um estímulo novo.' },
  forca: { name: 'Força', rir: '1–2', color: 'orange',
    desc: 'Cargas altas e poucas repetições nos movimentos principais, com descanso longo. Clusters ajudam a manter a técnica com carga pesada.' },
  deload: { name: 'Descarga', rir: '4', color: 'muted',
    desc: 'Semana mais leve para recuperar articulações e sistema nervoso. Metade das séries e ~10% menos carga. Você volta mais forte na próxima fase.' }
};

// Padrões de movimento → exercícios, do mais estável (bom para readaptação) ao mais exigente
const POOLS = {
  squat: ['leg-press', 'agachamento-goblet', 'agachamento-smith', 'agachamento-livre', 'hack', 'agachamento-corpo'],
  hinge: ['terra-romeno', 'stiff', 'levantamento-terra', 'ponte-gluteo'],
  lunge: ['afundo', 'step-up', 'bulgaro', 'passada', 'afundo-corpo'],
  hpush: ['chest-press', 'supino-reto-halter', 'supino-reto-barra', 'supino-smith', 'flexao'],
  incline: ['supino-inclinado-halter', 'supino-inclinado-barra', 'flexao'],
  vpush: ['desenvolvimento-maquina', 'desenvolvimento-halter', 'desenvolvimento-barra', 'arnold', 'flexao-pike'],
  vpull: ['puxada-frontal', 'puxada-supinada', 'puxada-triangulo', 'barra-assistida', 'barra-fixa', 'remada-invertida'],
  hpull: ['remada-maquina', 'remada-baixa', 'remada-unilateral', 'remada-curvada', 'remada-cavalinho', 'remada-invertida'],
  fly: ['voador', 'crossover', 'crucifixo-halter'],
  side: ['elevacao-lateral', 'elevacao-lateral-polia', 'flexao-pike'],
  rear: ['voador-inverso', 'face-pull', 'crucifixo-inverso', 'superman'],
  biceps: ['rosca-alternada', 'rosca-polia', 'rosca-direta', 'rosca-martelo', 'rosca-scott', 'rosca-inclinada'],
  triceps: ['triceps-polia', 'triceps-corda', 'triceps-frances', 'triceps-testa', 'mergulho-banco'],
  quad: ['cadeira-extensora', 'step-up', 'agachamento-corpo', 'afundo-corpo'],
  ham: ['mesa-flexora', 'cadeira-flexora', 'terra-romeno', 'ponte-gluteo'],
  glute: ['elevacao-quadril', 'abdutora', 'coice-polia', 'ponte-gluteo'],
  calves: ['panturrilha-pe', 'panturrilha-sentado', 'panturrilha-leg', 'panturrilha-halter', 'panturrilha-corpo'],
  core: ['prancha', 'dead-bug', 'abdominal-polia', 'elevacao-pernas', 'roda-abdominal', 'abdominal']
};
// Exercícios que o treinador evita na readaptação e para iniciantes no primeiro ciclo
const DEMANDING = new Set(['agachamento-livre', 'levantamento-terra', 'good-morning', 'supino-reto-barra', 'desenvolvimento-barra', 'barra-fixa', 'remada-curvada', 'hack', 'bulgaro', 'triceps-testa', 'roda-abdominal', 'stiff']);
const ISOLATION = new Set(['fly', 'side', 'rear', 'biceps', 'triceps', 'quad', 'ham', 'calves', 'glute']);
const HIGH_REPS = new Set(['side', 'rear', 'calves', 'core']);

const EQUIP_OK = {
  academia: null,
  halteres: new Set(['halter', 'corporal', 'kettlebell', 'elastico', 'nenhum']),
  nenhum: new Set(['corporal', 'nenhum'])
};

// Sessões por divisão. Ordem dos blocos = prioridade (se faltar tempo, cortam-se os últimos)
const M = (p, role = 'main') => ({ p, role });
const TEMPLATES = {
  'FB-A': { name: 'Full-body A', slots: [M('squat'), M('hpush'), M('vpull', 'sec'), M('hinge', 'sec'), M('side', 'acc'), M('core', 'acc'), M('biceps', 'acc')] },
  'FB-B': { name: 'Full-body B', slots: [M('hinge'), M('vpush'), M('hpull', 'sec'), M('lunge', 'sec'), M('triceps', 'acc'), M('calves', 'acc'), M('rear', 'acc')] },
  'FB-C': { name: 'Full-body C', slots: [M('squat'), M('incline'), M('hpull', 'sec'), M('glute', 'sec'), M('ham', 'acc'), M('core', 'acc'), M('side', 'acc')] },
  'UP-A': { name: 'Superior A', slots: [M('hpush'), M('hpull'), M('vpush', 'sec'), M('vpull', 'sec'), M('biceps', 'acc'), M('triceps', 'acc'), M('side', 'acc')] },
  'LO-A': { name: 'Inferior A', slots: [M('squat'), M('hinge', 'sec'), M('quad', 'acc'), M('ham', 'acc'), M('calves', 'acc'), M('core', 'acc')] },
  'UP-B': { name: 'Superior B', slots: [M('incline'), M('vpull'), M('hpull', 'sec'), M('fly', 'acc'), M('side', 'acc'), M('rear', 'acc'), M('biceps', 'acc'), M('triceps', 'acc')] },
  'LO-B': { name: 'Inferior B', slots: [M('hinge'), M('lunge', 'sec'), M('glute', 'sec'), M('quad', 'acc'), M('ham', 'acc'), M('calves', 'acc')] },
  PUSH: { name: 'Push · Empurrar', slots: [M('hpush'), M('vpush'), M('incline', 'sec'), M('side', 'acc'), M('fly', 'acc'), M('triceps', 'acc')] },
  PULL: { name: 'Pull · Puxar', slots: [M('vpull'), M('hpull'), M('hpull', 'sec'), M('rear', 'acc'), M('biceps', 'acc'), M('biceps', 'acc')] },
  LEGS: { name: 'Legs · Pernas', slots: [M('squat'), M('hinge', 'sec'), M('lunge', 'sec'), M('quad', 'acc'), M('ham', 'acc'), M('calves', 'acc'), M('core', 'acc')] }
};

export function splitFor(days, phase) {
  if (phase === 'readapt' || days <= 2) return ['FB-A', 'FB-B'];
  if (days === 3) return ['FB-A', 'FB-B', 'FB-C'];
  if (days === 4) return ['UP-A', 'LO-A', 'UP-B', 'LO-B'];
  if (days === 5) return ['PUSH', 'PULL', 'LEGS', 'UP-A', 'LO-B'];
  return ['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'LEGS'];
}
const SPLIT_NAME = { 2: 'Full-body', 3: 'Full-body A/B/C', 4: 'Superior/Inferior', 5: 'Push/Pull/Legs + Superior/Inferior', 6: 'Push/Pull/Legs 2x' };

const MAX_SLOTS = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 };

// Duração das fases em semanas
function weeksOf(phase, plan, p) {
  if (phase === 'readapt') return plan.readaptWeeks || 2;
  if (phase === 'hiper') return p.level === 'iniciante' ? 6 : 4;
  if (phase === 'intens' || phase === 'forca') return 3;
  return 1;
}

function readaptWeeksFor(p) {
  const base = { nao: 0, '1m': 1, '3m': 2, '6m': 3, mais: 4 }[p.breakTime] ?? 2;
  return Math.min(4, base + (p.level === 'iniciante' && base ? 1 : 0));
}

export function createPlan(p) {
  const rw = readaptWeeksFor(p);
  state.plan = { id: uid(), created: Date.now(), phase: rw ? 'readapt' : 'hiper', phaseStart: Date.now(), phaseSessions: 0, readaptWeeks: rw, meso: 0, blocks: 0, idx: 0, volAdj: 0, log: [] };
  initCardio(state.plan, p);
  state.plan.log.push({ ts: Date.now(), phase: state.plan.phase, why: rw ? 'Início do plano após uma pausa.' : 'Início do plano.' });
  save();
}

export const planWorkouts = () => state.workouts.filter(w => w.plan).sort((a, b) => a.start - b.start);

export function phaseStatus() {
  const plan = state.plan, p = state.profile;
  const weeks = weeksOf(plan.phase, plan, p), days = p.days || 3;
  const week = Math.min(weeks, Math.floor(plan.phaseSessions / days) + 1);
  return { ...PHASES[plan.phase], key: plan.phase, week, weeks, days, total: weeks * days, done: plan.phaseSessions };
}

function setPhase(phase, why) {
  const plan = state.plan;
  plan.phase = phase; plan.phaseStart = Date.now(); plan.phaseSessions = 0; plan.volAdj = 0;
  plan.log.push({ ts: Date.now(), phase, why });
  return { phase, why };
}

function nextPhase(plan, p) {
  if (plan.phase === 'readapt') return 'hiper';
  if (plan.phase === 'hiper') return p.level !== 'iniciante' || plan.blocks >= 1 ? 'intens' : 'deload';
  if (plan.phase === 'intens' || plan.phase === 'forca') return 'deload';
  // Depois da descarga: força uma vez por ciclo para quem busca força; senão novo ciclo de hipertrofia
  const str = goalWeight(p, 'Ganhar força');
  return (str === 2 || (str === 1 && plan.blocks % 2 === 1)) && plan.lastHeavy !== 'forca' ? 'forca' : 'hiper';
}

// Voltou depois de muitos dias parado? O plano recua para uma readaptação curta
export function checkBreak() {
  const plan = state.plan;
  if (!plan) return null;
  const last = state.workouts.reduce((m, w) => Math.max(m, w.start), 0);
  const gap = last ? (Date.now() - last) / DAY : 0;
  if (gap < 14 || plan.phase === 'readapt' || plan.breakHandled === last) return null;
  plan.breakHandled = last;
  plan.readaptWeeks = gap > 90 ? 3 : gap > 30 ? 2 : 1;
  const r = setPhase('readapt', `Você ficou ${Math.round(gap)} dias sem treinar. Vamos readaptar por ${plan.readaptWeeks} semana(s) antes de voltar ao ritmo.`);
  save();
  return r;
}

const recent = n => planWorkouts().filter(w => w.plan.kind !== 'cardio').slice(-n);

// Chamado ao concluir um treino do plano. Devolve a mudança de fase, se houver.
export function afterPlanWorkout(w, feedback) {
  const plan = state.plan, p = state.profile;
  if (!plan) return null;
  w.plan.feedback = feedback;
  plan.prefer = null;
  if (w.plan.kind === 'cardio') { const msg = afterCardio(w, feedback); save(); return msg ? { why: msg } : null; }
  plan.phaseSessions++;
  plan.idx++;

  // Ajuste fino de volume pelo feedback
  if (feedback === 1 && plan.phase !== 'deload') plan.volAdj = Math.min(1, plan.volAdj + 1);
  if (feedback >= 3) plan.volAdj = Math.max(-1, plan.volAdj - (feedback === 4 ? 1 : 0));

  const st = phaseStatus();
  const last2 = recent(2);
  const tired = last2.length === 2 && last2.every(x => (x.plan.feedback || 0) >= 4);
  const stalls = last2.flatMap(x => x.exercises).filter(e => e.coach === 'down').length;
  let change = null;

  if (['hiper', 'intens', 'forca'].includes(plan.phase) && (tired || stalls >= 3)) {
    plan.lastHeavy = plan.phase;
    change = setPhase('deload', tired ? 'Dois treinos seguidos exaustivos: hora de uma semana de descarga.' : 'Várias cargas travaram: uma descarga agora destrava a evolução.');
  } else if (plan.phase === 'readapt' && plan.phaseSessions >= st.days && last2.length === 2 && last2.every(x => x.plan.feedback === 1)) {
    change = setPhase('hiper', 'Os treinos estão leves para você: readaptação concluída antes do previsto.');
  } else if (plan.phaseSessions >= st.total) {
    const from = plan.phase, to = nextPhase(plan, p);
    if (from === 'intens' || from === 'forca') plan.lastHeavy = from;
    if (from === 'deload') {
      plan.meso++; plan.blocks++;
      // Depois de 2 ciclos completos, o iniciante passa a intermediário
      if (p.level === 'iniciante' && plan.blocks >= 2) p.level = 'intermediario';
    }
    const msgs = {
      hiper: from === 'deload' ? 'Novo ciclo! Exercícios complementares trocados para gerar estímulo novo.' : 'Readaptação concluída. Agora começamos a construir.',
      intens: 'Bom trabalho na hipertrofia. Agora entram técnicas avançadas para um estímulo novo.',
      deload: 'Fase concluída. Semana de descarga para recuperar e voltar mais forte.',
      forca: 'Novo ciclo com foco em força: cargas mais altas, menos repetições.'
    };
    change = setPhase(to, msgs[to]);
  }
  save();
  return change;
}

/* ---------- Montagem do treino ---------- */

// Sem equipamento: nada que exija barra
const NEEDS_BAR = new Set(['barra-fixa']);

function allowed(id, p) {
  if (p.place === 'nenhum' && NEEDS_BAR.has(id)) return false;
  const ok = EQUIP_OK[p.place || 'academia'];
  return !ok || ok.has(getEx(id).equip);
}

// Índice de rotação conforme a preferência de variedade do usuário
function rotation(plan, p, role) {
  const week = Math.floor(plan.phaseSessions / (p.days || 3));
  const v = p.variety || 'ciclo';
  if (role === 'main') return v === 'sempre' ? plan.meso + week : plan.meso;
  return v === 'sempre' ? plan.meso + plan.idx : v === 'semana' ? plan.meso + week : plan.meso;
}

function pickExercise(slot, i, ctx) {
  const { p, plan, used } = ctx;
  let pool = POOLS[slot.p].filter(id => allowed(id, p) && !used.has(id));
  if (!pool.length) return null;
  // Na descarga mantém os mesmos exercícios da fase anterior (só reduz séries e carga)
  const gentle = plan.phase === 'readapt' || (p.level === 'iniciante' && plan.blocks === 0);
  if (gentle) { const easy = pool.filter(id => !DEMANDING.has(id)); if (easy.length) pool = easy; }
  if (slot.role === 'main') {
    // Principal: fica o mesmo durante o ciclo; muda de ciclo em ciclo entre as melhores opções
    const strong = gentle ? pool : pool.filter(id => DEMANDING.has(id)).concat(pool.filter(id => !DEMANDING.has(id)));
    return strong[rotation(plan, p, 'main') % Math.min(2, strong.length)];
  }
  // Complementares: trocam a cada ciclo
  return pool[(rotation(plan, p, 'acc') + i) % pool.length];
}

function prescription(slot, phase, week, plan, p) {
  const iso = ISOLATION.has(slot.p), high = HIGH_REPS.has(slot.p);
  const role = slot.role;
  let sets, range, rest, warm = 0;
  if (phase === 'readapt') {
    sets = week === 1 ? 2 : role === 'acc' ? 2 : 3;
    range = role === 'main' ? [10, 12] : [12, 15];
    rest = role === 'main' ? 120 : 75; warm = role === 'main' ? 1 : 0;
  } else if (phase === 'hiper') {
    sets = 3 + (role === 'main' && week >= 3 && p.level !== 'iniciante' ? 1 : 0);
    range = role === 'main' ? [6, 10] : role === 'sec' ? [8, 12] : high ? [12, 20] : [10, 15];
    rest = role === 'main' ? 150 : role === 'sec' ? 120 : 60; warm = role === 'main' ? 1 : 0;
  } else if (phase === 'intens') {
    sets = role === 'main' ? 4 : 3;
    range = role === 'main' ? [5, 8] : role === 'sec' ? [6, 10] : high ? [12, 15] : [8, 12];
    rest = role === 'main' ? 180 : role === 'sec' ? 150 : 60; warm = role === 'main' ? 2 : 0;
  } else if (phase === 'forca') {
    sets = role === 'main' ? 5 : role === 'sec' ? 3 : 2;
    range = role === 'main' ? [3, 5] : role === 'sec' ? [5, 8] : [8, 12];
    rest = role === 'main' ? 210 : role === 'sec' ? 150 : 90; warm = role === 'main' ? 2 : 0;
  } else {
    sets = 2; range = role === 'main' ? [8, 10] : [10, 12]; rest = role === 'main' ? 120 : 60; warm = role === 'main' ? 1 : 0;
  }
  if (role !== 'main' && phase !== 'deload') sets = Math.max(2, sets + plan.volAdj);
  if (slot.p === 'core' && phase !== 'forca') range = [10, 15];
  return { sets, range, rest, warm, iso, quality: phase === 'forca' && role === 'main' ? 'forca' : 'hiper' };
}

// Todo treino trabalha um pouco de cada qualidade; o objetivo define a ênfase
export const QUALITIES = {
  forca: { label: 'Força', tip: 'Força: carga pesada, poucas repetições e descanso longo. Capriche no aquecimento.' },
  hiper: { label: 'Hipertrofia', tip: '' },
  resist: { label: 'Resistência', tip: 'Resistência: carga leve, muitas repetições e pouco descanso. Mantenha o ritmo.' }
};
const LIGHT_GOALS = new Set(['Emagrecer', 'Ganhar condicionamento']);
// Peso de cada objetivo para o usuário: 2 = principal, 1 = secundário, 0 = não escolhido
export const goalWeight = (p, g) => p.goal === g ? 2 : p.goal2 === g ? 1 : 0;
const lightWeight = p => Math.max(goalWeight(p, 'Emagrecer'), goalWeight(p, 'Ganhar condicionamento'));
const buildWeight = p => Math.max(goalWeight(p, 'Ganhar força'), goalWeight(p, 'Ganhar massa muscular'));

function applyQuality(rx, slot, pos, p, phase, exType) {
  if (!['hiper', 'intens', 'forca'].includes(phase)) return rx;
  const str = goalWeight(p, 'Ganhar força'), light = lightWeight(p);
  let q = rx.quality;
  // Força: sempre o 1º principal; objetivo principal força = todos; secundário = os 2 primeiros
  if (slot.role === 'main' && exType === 'peso' && (pos.main === 0 || str === 2 || (str === 1 && pos.main === 1))) q = 'forca';
  // Resistência: sempre o último complementar; emagrecer/condicionamento principal = todos
  // (alternados se o secundário for força/massa); como secundário = metade
  else if (slot.role === 'acc' && (pos.lastAcc || (light === 2 && (buildWeight(p) === 0 || pos.acc % 2 === 1)) || (light === 1 && pos.acc % 2 === 1))) q = 'resist';
  if (q === 'forca' && phase !== 'forca') {
    rx = { ...rx, sets: (phase === 'intens' ? 4 : 3) + (str === 2 ? 1 : 0), range: phase === 'intens' ? [3, 5] : [4, 6], rest: 180, warm: 2 };
  } else if (q === 'resist') {
    rx = { ...rx, sets: 2 + (light === 2 ? 1 : 0), range: [15, 20], rest: 45, warm: 0 };
  }
  return { ...rx, quality: q };
}

const SEC_TYPE = new Set(['prancha', 'prancha-lateral']);

const GOAL_FOCUS = { 'Ganhar massa muscular': 'hipertrofia', 'Ganhar força': 'força', 'Emagrecer': 'gasto calórico e resistência', 'Ganhar condicionamento': 'condicionamento', 'Melhorar saúde e bem-estar': 'saúde e equilíbrio' };

// Cardio no fim do treino de musculação, conforme objetivo e fase
const FINISH_MIN = { 'Ganhar massa muscular': 6, 'Ganhar força': 5, 'Emagrecer': 15, 'Ganhar condicionamento': 12, 'Melhorar saúde e bem-estar': 12 };
function cardioFinisher(plan, p, st) {
  let min = Math.max(FINISH_MIN[p.goal] ?? 8, Math.round((FINISH_MIN[p.goal2] ?? 0) * 0.6));
  if (plan.phase === 'readapt') min = 10;
  if (plan.phase === 'deload') min = Math.min(min, 8);
  if ((p.cardioDays || 0) >= 2) min = Math.round(min / 2);
  if ((p.minutes || 60) <= 30 && !lightWeight(p)) return null;
  if (min < 5) return null;
  const pool = p.place === 'academia' ? ['bike', 'esteira', 'eliptico', 'remo', 'escada'] : ['cardio-casa'];
  const exId = pool[plan.idx % pool.length];
  // Intervalado em semanas alternadas para quem busca emagrecer/condicionamento (fora da readaptação)
  const hiit = lightWeight(p) > 0 && ['hiper', 'intens', 'forca'].includes(plan.phase) && st.week % 2 === 0;
  if (hiit) {
    const reps = goalWeight(p, 'Ganhar condicionamento') ? 10 : 8;
    return { label: `${reps} tiros de 30 s`, exercise: { exId, rx: { quality: 'cardio' }, slot: { role: 'acc', p: 'cardio' }, rest: 60, group: null, tech: null, notes: '',
      tip: 'Intervalado: 30 s forte (difícil falar) e 60 s bem leve no descanso.', sets: Array.from({ length: reps }, () => ({ type: 'n', min: 0.5 })) } };
  }
  return { label: `${min} min de cardio`, exercise: { exId, rx: { quality: 'cardio' }, slot: { role: 'acc', p: 'cardio' }, rest: 0, group: null, tech: null, notes: '',
    tip: 'Cardio leve (zona 2): ritmo em que dá para conversar. Ajuda a recuperação e a saúde do coração.', sets: [{ type: 'n', min }] } };
}

// Atividades que cansam as pernas (para aliviar o treino de pernas no dia seguinte)
export const LEG_ACTIVITIES = new Set(['corrida', 'pedal', 'esteira', 'bike', 'futebol', 'futsal', 'basquete', 'volei', 'beach-tennis', 'tenis', 'trilha', 'crossfit', 'danca', 'escada']);
const LOWER_P = new Set(['squat', 'hinge', 'lunge', 'quad', 'ham', 'glute', 'calves']);

function legFatigue() {
  const since = Date.now() - 1.2 * DAY;
  const w = state.workouts.filter(x => x.start >= since && (x.kind === 'atividade' || x.plan?.kind === 'cardio')).find(x =>
    x.exercises.some(e => LEG_ACTIVITIES.has(e.exId)) && ((x.rpe || 2) >= 2 || x.plan?.type === 'longo' || x.plan?.type === 'intervalado'));
  return w || null;
}

// Musculação ou cardio hoje? Equilibra a semana conforme os dias escolhidos
export function nextKind() {
  const p = state.profile, plan = state.plan;
  if (!p.cardio || p.cardio === 'nao') return 'forca';
  if (plan.prefer) return plan.prefer;
  const week = planWorkouts().filter(w => w.start >= startOfWeek(Date.now()));
  const c = week.filter(w => w.plan.kind === 'cardio').length, s = week.length - c;
  const S = p.days || 3, Cd = p.cardioDays || 2;
  if (c >= Cd) return 'forca';
  if (s >= S) return 'cardio';
  return c / Cd < s / S ? 'cardio' : 'forca';
}

// Gera o próximo treino do plano (não salva nada)
export function nextSession() {
  const plan = state.plan, p = state.profile;
  if (p.cardio && p.cardio !== 'nao' && !plan.run) initCardio(plan, p);
  if (nextKind() === 'cardio') {
    const c = cardioSession(plan, p, plan.phase);
    return { ...c, key: 'cardio', phase: plan.phase, status: phaseStatus() };
  }
  return strengthSession();
}

function strengthSession() {
  const plan = state.plan, p = state.profile;
  const st = phaseStatus();
  const split = splitFor(p.days || 3, plan.phase);
  const key = split[plan.idx % split.length];
  const tpl = TEMPLATES[key];
  const used = new Set();
  const max = MAX_SLOTS[p.minutes || 60] || 6;
  const reasons = [];
  const exercises = [];

  const slots = tpl.slots.slice(0, max);
  const accIdx = slots.map((x, i) => x.role === 'acc' ? i : -1).filter(i => i >= 0);
  let mainCount = 0;
  slots.forEach((slot, i) => {
    const exId = pickExercise(slot, i, { p, plan, used });
    if (!exId) return;
    used.add(exId);
    const ex = getEx(exId);
    const pos = { main: slot.role === 'main' ? mainCount++ : -1, acc: accIdx.indexOf(i), lastAcc: i === accIdx.at(-1) && accIdx.length > 1 };
    const rx = applyQuality(prescription(slot, plan.phase, st.week, plan, p), slot, pos, p, plan.phase, ex.type);
    let sets;
    if (ex.type === 'tempo' || SEC_TYPE.has(exId)) sets = Array.from({ length: rx.sets }, () => ({ type: 'n', sec: plan.phase === 'readapt' ? 20 : 30 }));
    else sets = [...Array.from({ length: rx.warm }, () => ({ type: 'w', reps: 10 })), ...Array.from({ length: rx.sets }, () => ({ type: 'n', reps: rx.range[0], rmax: rx.range[1] }))];
    exercises.push({ exId, slot, rx, rest: rx.rest, sets, tech: null, group: null, notes: '', tip: QUALITIES[rx.quality]?.tip || '' });
  });

  // Técnicas escolhidas pelo treinador conforme a fase
  const isoEx = exercises.filter(e => e.rx.iso && e.rx.quality !== 'resist' && getEx(e.exId).type === 'peso');
  if (plan.phase === 'hiper' && st.week >= Math.max(3, st.weeks - 1) && isoEx.length) {
    const e = isoEx.at(-1);
    e.tech = 'failure'; e.sets.at(-1).type = 'f';
    reasons.push(`Última série de ${getEx(e.exId).name} até a falha: fim da fase de hipertrofia, hora de testar seus limites com segurança.`);
  }
  if (plan.phase === 'intens') {
    const main = exercises.find(e => e.slot.role === 'main' && e.rx.quality !== 'forca' && getEx(e.exId).type === 'peso');
    if (main && p.level !== 'iniciante' && st.week >= 2) {
      main.tech = 'pyrUp';
      main.sets = [{ type: 'w', reps: 10 }, ...[12, 10, 8, 6].map(r => ({ type: 'n', reps: r }))];
      reasons.push(`Pirâmide crescente em ${getEx(main.exId).name}: estímulo de força e volume no mesmo exercício.`);
    }
    const dropOn = isoEx.find(e => ['side', 'triceps', 'biceps', 'fly', 'quad'].includes(e.slot.p));
    if (dropOn) {
      dropOn.sets.push({ type: 'd', reps: 8 }, { type: 'd', reps: 8 });
      dropOn.tech = 'drop';
      reasons.push(`Drop set em ${getEx(dropOn.exId).name}: exercício seguro para levar à fadiga sem risco articular.`);
    }
    const rp = isoEx.find(e => e !== dropOn && getEx(e.exId).equip !== 'halter');
    if (rp && st.week >= 2) {
      rp.sets.push({ type: 'r', reps: 4 }, { type: 'r', reps: 4 });
      reasons.push(`Rest-pause em ${getEx(rp.exId).name}: mais repetições efetivas em pouco tempo.`);
    }
  }
  if (plan.phase === 'forca' && st.week >= 2) {
    const main = exercises.find(e => e.slot.role === 'main' && getEx(e.exId).type === 'peso');
    if (main) {
      main.sets = [...main.sets.filter(s => s.type === 'w'), { type: 'n', reps: 3 }, ...[1, 2, 3].map(() => ({ type: 'c', reps: 3 })), ...main.sets.filter(s => s.type === 'n').slice(1)];
      reasons.push(`Cluster em ${getEx(main.exId).name}: blocos de 3 com 20 s de pausa para treinar pesado com técnica.`);
    }
  }
  // Bi-set de braços para ganhar tempo nas fases mais intensas ou em treinos curtos
  const bi = exercises.find(e => e.slot.p === 'biceps'), tri = exercises.find(e => e.slot.p === 'triceps');
  if (bi && tri && (plan.phase === 'intens' || (p.minutes || 60) <= 45) && plan.phase !== 'readapt') {
    const [a, b] = exercises.indexOf(bi) < exercises.indexOf(tri) ? [bi, tri] : [tri, bi];
    exercises.splice(exercises.indexOf(b), 1);
    exercises.splice(exercises.indexOf(a) + 1, 0, b);
    a.group = b.group = 'bi-' + plan.idx;
    reasons.push('Bíceps e tríceps em bi-set: músculos opostos, um descansa enquanto o outro trabalha.');
  }

  // Emagrecer/condicionamento: complementares de resistência em circuito (sem descanso entre eles)
  const resist = exercises.filter(e => e.rx.quality === 'resist' && !e.group);
  if (lightWeight(p) === 2 && resist.length >= 2) {
    resist.forEach(e => exercises.splice(exercises.indexOf(e), 1));
    exercises.push(...resist);
    resist.forEach(e => { e.group = 'circ-' + plan.idx; });
    reasons.push(`${resist.length >= 3 ? 'Circuito' : 'Bi-set'} de resistência no fim: coração acelerado e mais gasto calórico.`);
  }

  // Atividade puxada para as pernas nas últimas 24 h: menos volume de pernas hoje
  const tired = legFatigue();
  const legs = exercises.filter(e => LOWER_P.has(e.slot.p));
  if (tired && legs.length && plan.phase !== 'deload') {
    legs.forEach(e => { const n = e.sets.filter(x => x.type === 'n'); if (n.length > 2) e.sets.splice(e.sets.indexOf(n.at(-1)), 1); });
    reasons.push(`Você fez ${tired.name.toLowerCase()} há pouco: 1 série a menos nos exercícios de perna para recuperar.`);
  }

  // Ênfase do dia
  const q = { forca: 0, hiper: 0, resist: 0 };
  exercises.forEach(e => { q[e.rx.quality] = (q[e.rx.quality] || 0) + 1; });
  const finisher = cardioFinisher(plan, p, st);
  if (['hiper', 'intens', 'forca'].includes(plan.phase)) {
    const parts = [q.forca && `${q.forca} de força`, q.hiper && `${q.hiper} de hipertrofia`, q.resist && `${q.resist} de resistência`].filter(Boolean);
    reasons.unshift(`Hoje: ${parts.join(', ')}${finisher ? ` + ${finisher.label}` : ''}. Ênfase em ${GOAL_FOCUS[p.goal] || 'hipertrofia'}${p.goal2 && GOAL_FOCUS[p.goal2] ? `, com ${GOAL_FOCUS[p.goal2]}` : ''}.`);
  }
  if (finisher) exercises.push(finisher.exercise);

  if (plan.phase === 'readapt') reasons.unshift(`Semana ${st.week} de ${st.weeks} da readaptação: pare cada série com 3–4 repetições sobrando.`);
  if (plan.phase === 'deload') reasons.unshift('Semana de descarga: metade das séries e cargas ~10% menores.');
  if (plan.volAdj > 0) reasons.push('Você marcou o último treino como leve: +1 série nos complementares.');
  if (plan.volAdj < 0) reasons.push('Último treino foi exaustivo: 1 série a menos nos complementares.');

  return { kind: 'forca', key, name: tpl.name, phase: plan.phase, status: st, split: SPLIT_NAME[p.days] || 'Full-body', exercises, reasons };
}
