// Plano do treinador: questionário inicial, cartão "Treino de hoje" e página do plano
import { state, save, getEx } from '../store.js';
import { esc, fmtDate, fmtRest } from '../util.js';
import { icon, confirmBox, toast, menu } from '../ui.js';
import { go, back } from '../router.js';
import { LEVELS, BREAKS, PLACES, PHASES, VARIETY, QUALITIES, SEXES, FOCUS, createPlan, nextSession, phaseStatus, planWorkouts } from '../planner.js';
import { startPlanSession } from '../workout.js';
import { CARDIO_CHOICES } from '../cardio.js';
import { RACES, FIVE_K, RACE_PHASES, raceStatus, zones, pace } from '../race.js';
import { voicePacks, syncPack } from '../voicepack.js';
import { TECHNIQUES } from '../techniques.js';

const GOALS = { 'Ganhar massa muscular': 'Hipertrofia, mais músculo', 'Ganhar força': 'Levantar mais peso', 'Emagrecer': 'Perder gordura mantendo músculo', 'Ganhar condicionamento': 'Mais fôlego e resistência', 'Melhorar saúde e bem-estar': 'Disposição e qualidade de vida' };

const STEPS = [
  { key: 'goal', q: 'Qual é o seu objetivo principal?', opts: GOALS },
  { key: 'goal2', q: 'E um objetivo secundário?', opts: a => ({ ...Object.fromEntries(Object.entries(GOALS).filter(([k]) => k !== a.goal)), '': 'Só o objetivo principal' }), goalLike: true },
  { key: 'sex', q: 'Para quem é o treino?', opts: { f: 'O treinador ajusta volume, descanso e saltos de carga', m: 'O treinador ajusta volume, descanso e saltos de carga', x: 'Usa os ajustes padrão' }, labels: SEXES },
  { key: 'focus', q: 'Quer priorizar alguma região?', opts: Object.fromEntries(Object.entries(FOCUS).map(([k, v]) => [k, v[1]])), labels: Object.fromEntries(Object.entries(FOCUS).map(([k, v]) => [k, v[0]])) },
  { key: 'level', q: 'Qual a sua experiência com musculação?', opts: { iniciante: 'Menos de 1 ano de treino', intermediario: '1 a 3 anos treinando com regularidade', avancado: 'Mais de 3 anos, conheço bem as técnicas' }, labels: LEVELS },
  { key: 'breakTime', q: 'Está treinando ou ficou um tempo parado?', opts: { nao: 'Treino com regularidade', '1m': 'Parei há menos de 1 mês', '3m': 'Parei há 1 a 3 meses', '6m': 'Parei há 3 a 6 meses', mais: 'Parei há mais de 6 meses' }, labels: BREAKS },
  { key: 'days', q: 'Quantos dias por semana de musculação?', opts: { 2: '2 dias', 3: '3 dias', 4: '4 dias', 5: '5 dias', 6: '6 dias' }, num: true },
  { key: 'minutes', q: 'Quanto tempo você tem por treino?', opts: { 30: '30 minutos', 45: '45 minutos', 60: '1 hora', 75: '1h15', 90: '1h30 ou mais' }, num: true },
  { key: 'place', q: 'Onde você vai treinar?', opts: { academia: 'Máquinas, polias, barras e halteres', halteres: 'Halteres e peso do corpo', nenhum: 'Só o peso do corpo' }, labels: PLACES },
  { key: 'cardio', q: 'Quer incluir corrida ou pedal no plano?', opts: { nao: 'O plano já inclui um pouco de cardio no fim dos treinos', corrida: 'Treinos de corrida com progressão própria', pedal: 'Treinos de pedal com progressão própria', ambos: 'Alterna corrida e pedal' }, labels: CARDIO_CHOICES },
  { key: 'cardioDays', q: 'Quantas vezes por semana de cardio?', opts: { 1: '1 vez', 2: '2 vezes', 3: '3 vezes' }, num: true, when: a => a.cardio && a.cardio !== 'nao' },
  { key: 'race', q: 'Vai correr alguma prova?', opts: { nao: 'Só treinar, sem data marcada', ...Object.fromEntries(Object.entries(RACES).map(([k, [n]]) => [k, n])) }, labels: { nao: 'Não, sem prova', ...Object.fromEntries(Object.entries(RACES).map(([k, [n]]) => [k, n])) }, raceOpts: true, when: a => ['corrida', 'ambos'].includes(a.cardio) },
  { key: 'raceDate', q: 'Quando é a prova?', date: true, when: a => ['corrida', 'ambos'].includes(a.cardio) && RACES[a.race] },
  { key: 'raceTime', q: 'Quanto tempo você leva para correr 5 km hoje?', opts: FIVE_K, num: true, order: Object.keys(FIVE_K).sort((a, b) => (+a || 99) - (+b || 99)), when: a => ['corrida', 'ambos'].includes(a.cardio) && RACES[a.race] },
  { key: 'variety', q: 'Com que frequência quer mudar a ficha?', opts: Object.fromEntries(Object.entries(VARIETY).map(([k, v]) => [k, v[1]])), labels: Object.fromEntries(Object.entries(VARIETY).map(([k, v]) => [k, v[0]])) }
];

/* ---------- Questionário ---------- */

let step = 0, answers = {};

export const wizard = {
  hideTabs: true,
  render() {
    if (step === 0 && !Object.keys(answers).length) answers = { ...state.profile };
    const s = STEPS[step];
    if (!s) return `<div class="wizard"><div class="done-hero">${icon('trophy', 40)}<h3>Plano pronto!</h3>
        <p class="muted">Seu treinador vai começar ${answers.breakTime && answers.breakTime !== 'nao' ? 'com uma readaptação para seu corpo voltar a se acostumar com a carga' : 'direto na fase de hipertrofia'}. A cada treino você conta como foi, e ele ajusta o resto.</p></div>
        <button class="btn primary block lg" data-act="create">Ver meu primeiro treino</button>
        <button class="btn ghost block" data-act="prev">Voltar</button></div>`;
    return `<div class="wizard">
      <header class="row between"><button class="icon-btn" data-act="prev" aria-label="Voltar">${icon('back')}</button><span class="muted small">${step + 1} de ${STEPS.length}</span><span style="width:38px"></span></header>
      <div class="steps">${STEPS.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="eyebrow">Seu treinador</div><h2>${esc(s.q)}</h2>
      ${s.key === 'goal2' ? '<p class="muted small">O treinador combina os dois: o principal define a base do treino e o secundário entra com menos peso.</p>' : ''}
      ${s.key === 'raceTime' ? '<p class="muted small">Serve para calcular os ritmos de cada treino. Se não souber, o app descobre pelas suas corridas.</p>' : ''}
      ${s.date ? `<label class="field"><span>Data da prova</span><input type="date" data-f="raceDate" min="${new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)}" value="${esc(answers.raceDate || '')}"></label>
        <button class="btn primary block lg" data-act="answerDate" style="margin-top:16px">Continuar</button>` : ''}
      <div class="opts">${s.date ? '' : (s.order ? s.order.map(k => [k, s.opts[k]]) : Object.entries(typeof s.opts === 'function' ? s.opts(answers) : s.opts)).map(([k, d]) => {
        const goalLike = s.key === 'goal' || s.goalLike;
        const label = s.labels?.[k] || (goalLike ? (k || 'Nenhum') : d);
        const sub = (s.labels || goalLike) && !s.raceOpts ? d : '';
        return `<button class="opt ${String(answers[s.key]) === k ? 'on' : ''}" data-act="answer" data-k="${esc(k)}">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
      }).join('')}</div></div>`;
  },
  input(el) { if (el.dataset.f === 'raceDate') answers.raceDate = el.value; },
  actions: {
    answerDate(el, rerender) {
      const v = document.querySelector('[data-f="raceDate"]')?.value || answers.raceDate;
      if (!v || new Date(v + 'T12:00') < Date.now() + 6 * 864e5) return toast('Escolha uma data a partir da semana que vem');
      answers.raceDate = v;
      step++;
      while (STEPS[step]?.when && !STEPS[step].when(answers)) step++;
      rerender();
    },
    answer(el, rerender) {
      const s = STEPS[step];
      answers[s.key] = s.num ? +el.dataset.k : el.dataset.k;
      if (s.key === 'goal' && answers.goal2 === answers.goal) answers.goal2 = '';
      // Sugestão inicial de prioridade (a pessoa pode trocar na próxima tela)
      if (s.key === 'sex' && !answers.focusPicked) answers.focus = answers.sex === 'f' ? 'gluteos' : 'equilibrado';
      if (s.key === 'focus') answers.focusPicked = true;
      step++;
      while (STEPS[step]?.when && !STEPS[step].when(answers)) step++;
      rerender();
    },
    prev(el, rerender) {
      if (step === 0) { answers = {}; return back('/inicio'); }
      step--;
      while (step > 0 && STEPS[step]?.when && !STEPS[step].when(answers)) step--;
      rerender();
    },
    async create() {
      if (state.plan && !(await confirmBox('Refazer o plano?', 'O plano atual recomeça do início. Seu histórico de treinos continua.', 'Refazer'))) return;
      delete answers.focusPicked;
      Object.assign(state.profile, answers);
      createPlan(state.profile);
      // Já deixa a voz natural escolhida e baixando (se houver pacote publicado)
      if (!state.profile.voicePack) voicePacks().then(v => { if (v.length) { state.profile.voicePack = v[0].id; save(); syncPack(); } });
      step = 0; answers = {};
      go('/plano', { replace: true });
      toast('Plano criado');
    }
  }
};

export function startWizard() { step = 0; answers = {}; go('/plano/novo'); }

/* ---------- Cartão "Treino de hoje" ---------- */

const rxText = e => {
  const main = e.sets.filter(s => s.type !== 'w' && !['d', 'r', 'c'].includes(s.type));
  const t = main[0] || e.sets[0];
  if (e.tech === 'pyrUp') return 'pirâmide 12-10-8-6';
  if (t?.sec) return `${main.length} × ${t.sec}s`;
  if (t?.min != null) return main.length > 1 ? `${main.length} × ${t.min < 1 ? t.min * 60 + ' s' : t.min + ' min'}` : `${t.min} min`;
  return `${main.length} × ${t?.rmax ? `${t.reps}–${t.rmax}` : t?.reps}`;
};

export function todayCard({ full = false } = {}) {
  if (!state.plan) return `<button class="card today" data-act="planSetup">
      <span class="phase-pill">${icon('bulb', 13)} Novo</span>
      <h2>Monte seu plano com o treinador</h2>
      <p class="muted small">Responda algumas perguntas e o app monta seus treinos, ajusta cargas e escolhe técnicas conforme você evolui.</p>
      <span class="btn primary block">Começar</span></button>`;
  const sess = nextSession(), st = sess.status;
  const list = sess.exercises.map(e => `<li>${esc(getEx(e.exId).name)} <small>· ${e.rx?.quality && e.rx.quality !== 'hiper' && QUALITIES[e.rx.quality] ? QUALITIES[e.rx.quality].label.toLowerCase() + ' · ' : ''}${rxText(e)}${e.group ? (e.group.startsWith('circ') ? ' · circuito' : ' · bi-set') : ''}${e.tech && TECHNIQUES[e.tech] ? ' · ' + TECHNIQUES[e.tech].label.toLowerCase() : ''}</small></li>`).join('');
  return `<section class="card today">
    <div class="row between"><span class="phase-pill ${sess.kind === 'cardio' ? 'blue' : st.color}">${sess.race ? `Prova · ${esc(RACE_PHASES[raceStatus(state.plan.race).phase][0])}` : sess.kind === 'cardio' ? 'Cardio' : `${esc(st.name)} · semana ${st.week} de ${st.weeks}`}</span>${full ? '' : `<button class="link" data-act="planPage">Ver plano</button>`}</div>
    <div><small class="muted">Treino de hoje</small><h2>${esc(sess.name)}</h2></div>
    <ul>${list}</ul>
    ${sess.reasons.length ? `<div class="why">${sess.reasons.map(r => `<p>${icon('bulb', 14)}<span>${esc(r)}</span></p>`).join('')}</div>` : ''}
    <button class="btn primary block lg" data-act="planStart">${icon('play', 18)} Começar treino de hoje</button>
    ${state.profile.cardio && state.profile.cardio !== 'nao' ? `<button class="link center" data-act="planSwap">${sess.kind === 'cardio' ? 'Prefere musculação hoje?' : 'Prefere cardio hoje?'}</button>` : ''}
  </section>`;
}

export const todayActions = {
  planSetup: () => startWizard(),
  planPage: () => go('/plano'),
  planStart: () => startPlanSession(nextSession()),
  planSwap: (el, rerender) => { state.plan.prefer = nextSession().kind === 'cardio' ? 'forca' : 'cardio'; save(); rerender(); }
};

/* ---------- Página do plano ---------- */

// Contagem regressiva, fase e ritmos-alvo da prova
function raceCard() {
  const r = state.plan.race;
  if (!r || r.done) return '';
  const rs = raceStatus(r), Z = zones(r);
  const order = ['base', 'construcao', 'pico', 'polimento', 'prova'];
  const rows = Z ? [['Leve', Z.leve], ['Longão', Z.longo], ['Limiar (tempo)', Z.tempo], ['Tiros', Z.tiros], ['Ritmo de prova', Z.prova]]
    .map(([n, [a, b]]) => `<div class="done-set"><span class="grow">${n}</span><b>${pace(a).replace('/km', '')}–${pace(b)}</b></div>`).join('') : '';
  return `<section class="card race">
    <div class="row between"><b>${esc(rs.name)} · ${fmtDate(r.date, { day: '2-digit', month: 'long' })}</b><span class="phase-pill blue">${rs.daysLeft > 0 ? `faltam ${rs.daysLeft} dias` : 'hoje!'}</span></div>
    <div class="progress-bar" style="margin:10px 0"><i style="width:${Math.min(100, (rs.week / rs.total) * 100)}%"></i></div>
    <p class="small">Semana ${rs.week} de ${rs.total} · <b>${esc(RACE_PHASES[rs.phase][0])}</b>: ${esc(RACE_PHASES[rs.phase][1])}</p>
    <div class="race-phases">${order.map(ph => `<span class="${ph === rs.phase ? 'on' : ''}">${esc(RACE_PHASES[ph][0])}</span>`).join('')}</div>
    ${Z ? `<p class="muted small" style="margin-top:10px">Seus ritmos (5 km em ${Math.round(r.p5 * 5)} min · prova prevista em ${fmtTime(Z.racePace * RACES[r.dist][1])}):</p>${rows}` : '<p class="muted small" style="margin-top:10px">Os ritmos aparecem depois da primeira corrida leve com a distância anotada.</p>'}
  </section>`;
}
const fmtTime = min => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`; };

const CYCLE = p => ['readapt', 'hiper', ...(p.level !== 'iniciante' ? ['intens'] : []), 'deload', ...([p.goal, p.goal2].includes('Ganhar força') ? ['forca', 'deload'] : [])];

export const page = {
  render() {
    if (!state.plan) { setTimeout(() => startWizard()); return ''; }
    const p = state.profile, plan = state.plan, st = phaseStatus();
    const cycle = CYCLE(p).filter(ph => ph !== 'readapt' || plan.phase === 'readapt');
    const nowIdx = cycle.indexOf(plan.phase);
    const done = planWorkouts().length;
    return `<div class="page-head"><div><div class="eyebrow">Seu treinador</div><h1>Plano</h1></div><button class="btn ghost sm" data-act="redo">Ajustar</button></div>
      ${todayCard({ full: true })}
      ${raceCard()}
      <section class="card">
        <div class="row between"><b>Fase atual: ${esc(st.name)}</b><small class="muted">${st.done} de ${st.total} treinos</small></div>
        <div class="progress-bar" style="margin:10px 0"><i style="width:${Math.min(100, (st.done / st.total) * 100)}%"></i></div>
        <p class="muted small">${esc(st.desc)}</p>
        <p class="small" style="margin-top:8px">Intensidade: termine as séries com <b>${esc(st.rir)}</b> repetições sobrando.</p>
      </section>
      <section class="card"><b>Seu ciclo</b>
        <div class="timeline" style="margin-top:12px">${cycle.map((ph, i) => `<div class="tl ${i === nowIdx ? 'now' : i < nowIdx ? 'done' : ''}"><i></i><div><b>${esc(PHASES[ph].name)}</b><small>${i === nowIdx ? 'Agora · ' : ''}${esc(PHASES[ph].desc.split('.')[0])}.</small></div></div>`).join('')}</div>
        <p class="muted small">Depois da descarga começa um novo ciclo com os exercícios complementares trocados. Ciclos completos: ${plan.blocks}.</p>
      </section>
      <section class="card"><b>Seu perfil de treino</b>
        <p class="muted small" style="margin-top:6px">${p.sex ? esc(SEXES[p.sex]) + ' · ' : ''}${esc(p.goal)}${p.goal2 ? ' + ' + esc(p.goal2.toLowerCase()) : ''}${p.focus && p.focus !== 'equilibrado' ? ' · prioridade ' + esc(FOCUS[p.focus][0].toLowerCase()) : ''} · ${esc(LEVELS[p.level] || '')} · ${p.days} dias/semana · ${p.minutes} min · ${esc(PLACES[p.place] || '')}${p.cardio && p.cardio !== 'nao' ? ` · ${esc(CARDIO_CHOICES[p.cardio])} ${p.cardioDays}x/semana` : ''}</p>
        <p class="muted small">${done} treinos feitos pelo plano.</p>
        <button class="setting" data-act="variety"><span>Troca de ficha</span><b>${esc(VARIETY[p.variety || 'ciclo'][0])}</b></button></section>
      ${plan.log.length ? `<section class="card"><b>Decisões do treinador</b>${plan.log.slice(-6).reverse().map(l => `<div class="done-set" style="align-items:flex-start;margin-top:8px"><small class="muted" style="min-width:52px">${fmtDate(l.ts)}</small><span class="small"><b>${esc(PHASES[l.phase].name)}</b> — ${esc(l.why)}</span></div>`).join('')}</section>` : ''}`;
  },
  actions: {
    ...todayActions,
    redo: () => startWizard(),
    async variety(el, rerender) {
      const v = await menu('Troca de ficha', Object.entries(VARIETY).map(([k, [label, desc]]) => ({ label: label + (state.profile.variety === k ? '  ✓' : ''), desc, value: k })));
      if (!v) return;
      state.profile.variety = v; save(); rerender(); toast('Preferência salva: o próximo treino já segue ela');
    }
  }
};
