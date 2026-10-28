import { state, save, getEx } from '../store.js';
import { KINDS, GROUPS, PROGRAMS } from '../data.js';
import { esc, uid, num, fmtNum, fmtRest, plural } from '../util.js';
import { icon, menu, confirmBox, toast, sheet } from '../ui.js';
import { go, back } from '../router.js';
import { startFromRoutine, startFromExercises } from '../workout.js';
import { openPicker, openSwap } from './picker.js';
import { todayActions } from './plan.js';
import { COLS, chooseTechnique, linkWithNext, unlink, techList } from './live.js';
import { applyTechnique, isMain, SET_TYPES, TECHNIQUES, groupName } from '../techniques.js';

let kindFilter = '';

export function render() {
  const list = state.routines.filter(r => !kindFilter || r.kind === kindFilter);
  return `<div class="page-head"><div><div class="eyebrow">Treinar</div><h1>Rotinas</h1></div>
      <button class="btn primary sm" data-act="newRoutine">${icon('plus', 16)} Nova</button></div>
    <div class="quick">
      <button class="card quick-btn" data-act="planPage">${icon('bulb', 22)}<b>${state.plan ? 'Plano do treinador' : 'Criar plano com o treinador'}</b><small>${state.plan ? 'Treinos montados e ajustados automaticamente' : 'O app monta e ajusta seus treinos sozinho'}</small></button>
      <button class="card quick-btn" data-act="byGroup">${icon('dumbbell', 22)}<b>Montar por grupo muscular</b><small>Escolha os músculos e o app monta o treino</small></button>
    </div>
    <div class="chips scroll-x"><button class="chip ${!kindFilter ? 'on' : ''}" data-act="kind" data-k="">Todas</button>
      ${Object.entries(KINDS).map(([k, v]) => `<button class="chip ${kindFilter === k ? 'on' : ''}" data-act="kind" data-k="${k}">${v}</button>`).join('')}</div>
    ${groups(list) || '<div class="empty">Nenhuma rotina aqui ainda.</div>'}`;
}

const summary = r => r.exercises.map(e => getEx(e.exId).name).join(' · ') || 'Sem exercícios';

const routineCard = r => `<div class="card r-mini">
  <button class="grow r-title" data-act="edit" data-id="${r.id}"><b>${esc(r.name)}</b><small>${plural(r.exercises.length, 'exercício', 'exercícios')} · ${esc(summary(r))}</small></button>
  <button class="icon-btn" data-act="more" data-id="${r.id}" aria-label="Opções">${icon('more')}</button>
  <button class="btn primary sm" data-act="start" data-id="${r.id}" aria-label="Iniciar ${esc(r.name)}">${icon('play', 14)}</button></div>`;

// Rotinas do usuário primeiro; depois as fichas prontas agrupadas por programa
function groups(list) {
  const known = new Set(PROGRAMS.map(p => p.id));
  const mine = list.filter(r => !known.has(r.program));
  let html = mine.length ? `<div class="section-head"><h2>Minhas rotinas</h2></div>${mine.map(routineCard).join('')}` : '';
  for (const p of PROGRAMS) {
    const rs = list.filter(r => r.program === p.id);
    if (!rs.length) continue;
    html += `<details class="program" ${openPrograms.has(p.id) ? 'open' : ''} data-p="${p.id}"><summary><span class="grow"><b>${esc(p.name)}</b><small>${plural(rs.length, 'treino', 'treinos')}</small></span>${icon('down', 18)}</summary>
      <p class="muted small">${esc(p.desc)}</p>${rs.map(routineCard).join('')}</details>`;
  }
  return html;
}

const openPrograms = new Set(['fb3']);
export function mount(root) {
  root.querySelectorAll('details.program').forEach(d => d.addEventListener('toggle', () => { d.open ? openPrograms.add(d.dataset.p) : openPrograms.delete(d.dataset.p); }));
}

const byId = id => state.routines.find(r => r.id === id);

function pickGroups(api, chosen) {
  api.el.querySelectorAll('[data-g]').forEach(b => b.classList.toggle('on', chosen.has(b.dataset.g)));
  api.el.querySelector('[data-act="buildGo"]').disabled = !chosen.size;
}

// Quantos exercícios por grupo: menos por grupo quanto mais grupos no dia
function buildFromGroups(groups) {
  const per = groups.length === 1 ? 4 : groups.length === 2 ? 3 : 2;
  const ids = groups.flatMap(g => GROUPS[g].slice(0, g === 'Cardio' ? 1 : g === 'Pernas' ? per + 1 : per));
  return [...new Set(ids)];
}

export const actions = {
  planPage: () => state.plan ? go('/plano') : todayActions.planSetup(),
  kind: (el, rerender) => { kindFilter = el.dataset.k; rerender(); },
  start: el => startFromRoutine(byId(el.dataset.id)),
  edit: el => go('/rotina/' + el.dataset.id),
  newRoutine: () => go('/rotina/nova'),
  async more(el, rerender) {
    const r = byId(el.dataset.id);
    const v = await menu(r.name, [
      { label: 'Editar', value: 'edit', icon: 'edit' }, { label: 'Duplicar', value: 'dup', icon: 'copy' },
      { label: 'Excluir rotina', value: 'del', icon: 'trash', danger: true }]);
    if (v === 'edit') go('/rotina/' + r.id);
    if (v === 'dup') { state.routines.splice(state.routines.indexOf(r) + 1, 0, { ...JSON.parse(JSON.stringify(r)), id: uid(), name: r.name + ' (cópia)' }); save(); rerender(); toast('Rotina duplicada'); }
    if (v === 'del' && await confirmBox('Excluir rotina?', `"${r.name}" será removida. Seus treinos já feitos continuam no histórico.`, 'Excluir', true)) {
      state.routines = state.routines.filter(x => x !== r); save(); rerender(); toast('Rotina excluída');
    }
  },
  byGroup() {
    const chosen = new Set();
    sheet(`<h3 class="sheet-title">Quais grupos hoje?</h3><p class="muted">Selecione um ou mais. O app sugere os exercícios e você ajusta durante o treino.</p>
      <div class="chips wrap">${Object.keys(GROUPS).map(g => `<button class="chip lg" data-act="g" data-g="${g}">${g}</button>`).join('')}</div>
      <div class="row gap"><button class="btn ghost grow" data-act="buildSave">Salvar como rotina</button><button class="btn primary grow" data-act="buildGo" disabled>Começar agora</button></div>`, {
      g: (b, api) => { chosen.has(b.dataset.g) ? chosen.delete(b.dataset.g) : chosen.add(b.dataset.g); pickGroups(api, chosen); },
      buildGo: (b, api) => { if (!chosen.size) return; api.close(); startFromExercises([...chosen].join(', '), buildFromGroups([...chosen])); },
      buildSave: (b, api) => {
        if (!chosen.size) return toast('Escolha pelo menos um grupo');
        const r = { id: uid(), name: [...chosen].join(', '), kind: chosen.has('Cardio') && chosen.size === 1 ? 'cardio' : 'musculacao', created: Date.now(),
          exercises: buildFromGroups([...chosen]).map(exId => ({ id: uid(), exId, rest: state.profile.rest, notes: '', sets: [{ type: 'n', reps: 10 }, { type: 'n', reps: 10 }, { type: 'n', reps: 10 }] })) };
        state.routines.unshift(r); save(); api.close(); go('/rotina/' + r.id);
      }
    });
  }
};

/* ---------- Editor de rotina ---------- */

let draft = null;

const emptySetFor = type => type === 'cardio' ? { type: 'n', km: null, min: 20 } : type === 'tempo' ? { type: 'n', sec: 30 } : { type: 'n', reps: 10 };

export const editor = {
  hideTabs: true,
  render([id]) {
    if (!draft || draft._for !== id) {
      const r = id === 'nova' ? { id: uid(), name: '', kind: 'musculacao', exercises: [], isNew: true } : byId(id);
      if (!r) { setTimeout(() => go('/rotinas', { replace: true })); return ''; }
      draft = { ...JSON.parse(JSON.stringify(r)), _for: id };
    }
    return `<header class="live-head"><button class="icon-btn" data-act="cancel" aria-label="Voltar">${icon('back')}</button>
        <b class="grow center">${draft.isNew ? 'Nova rotina' : 'Editar rotina'}</b>
        <button class="btn primary sm" data-act="save">Salvar</button></header>
      <label class="field"><span>Nome da rotina</span><input data-f="name" value="${esc(draft.name)}" placeholder="Ex.: Treino A — Peito e tríceps" maxlength="50"></label>
      <label class="field"><span>Modalidade</span><select data-f="kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${draft.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      ${draft.exercises.map((e, i) => {
        const ex = getEx(e.exId), cols = COLS[ex.type];
        const group = e.group ? draft.exercises.filter(x => x.group === e.group) : null;
        const techs = techList(e).filter(k => k !== 'superset');
        return `<article class="ex-card ${group ? 'grouped' : ''}" data-i="${i}">
          ${group ? `<div class="group-tag">${icon('swap', 13)} ${groupName(group.length).toUpperCase()} · ${group.indexOf(e) + 1}/${group.length}</div>` : ''}
          <div class="ex-head"><div class="ex-title"><b>${esc(ex.name)}</b><small>${plural(e.sets.length, 'série', 'séries')} · descanso ${fmtRest(e.rest)}</small></div>
            <button class="icon-btn" data-act="exMenu" aria-label="Opções">${icon('more')}</button></div>
          ${techs.map(k => `<p class="tech"><b>${esc(TECHNIQUES[k].label)}:</b> ${esc(TECHNIQUES[k].desc)}</p>`).join('')}
          <div class="set-row c${cols.length} head plan"><span>SÉRIE</span>${cols.map(c => `<span>${c[1]}</span>`).join('')}<span></span></div>
          ${e.sets.map((s, j) => `<div class="set-row c${cols.length} plan" data-j="${j}"><span class="set-tag t-${s.type}">${SET_TYPES[s.type]?.tag || e.sets.slice(0, j + 1).filter(isMain).length}</span>
            ${cols.map(([f, l]) => `<input data-f="${f}" inputmode="${f === 'reps' ? 'text' : 'decimal'}" placeholder="${l === 'KG' ? 'livre' : f === 'reps' ? 'ex.: 8-12' : '—'}" value="${f === 'reps' && s.rmax ? `${s.reps}-${s.rmax}` : s[f] != null ? esc(fmtNum(s[f], 2)) : ''}" aria-label="${l} série ${j + 1}">`).join('')}
            <button class="icon-btn sm" data-act="delSet" aria-label="Remover série">${icon('x', 16)}</button></div>`).join('')}
          <button class="btn soft block" data-act="addSet">${icon('plus', 16)} Série</button></article>`;
      }).join('')}
      <button class="btn primary block" data-act="addEx">${icon('plus', 18)} Adicionar exercício</button>
      ${draft.isNew ? '' : `<button class="btn danger-ghost block" data-act="delete">Excluir rotina</button>`}`;
  },
  input(el) {
    const f = el.dataset.f;
    if (f === 'name' || f === 'kind') { draft[f] = el.value; return; }
    const e = draft.exercises[+el.closest('[data-i]').dataset.i];
    const set = e.sets[+el.closest('[data-j]').dataset.j];
    if (f === 'reps') {
      // Aceita faixa de repetições: "8-12"
      const [a, b] = el.value.split(/[-–a]/).map(num);
      set.reps = a; if (b && a && b > a) set.rmax = b; else delete set.rmax;
    } else set[f] = num(el.value);
  },
  actions: {
    cancel: () => { draft = null; back('/rotinas'); },
    save() {
      if (!draft.name.trim()) return toast('Dê um nome à rotina');
      const { _for, isNew, ...r } = draft;
      r.name = r.name.trim();
      if (isNew) state.routines.unshift(r); else state.routines = state.routines.map(x => x.id === r.id ? r : x);
      save(); draft = null; toast('Rotina salva'); go('/rotinas', { replace: true });
    },
    async delete() {
      if (!(await confirmBox('Excluir rotina?', 'Seus treinos já feitos continuam no histórico.', 'Excluir', true))) return;
      state.routines = state.routines.filter(x => x.id !== draft.id); save(); draft = null; go('/rotinas', { replace: true });
    },
    addEx: (el, rerender) => openPicker({ onDone: ids => {
      for (const id of ids) { const t = getEx(id).type; draft.exercises.push({ id: uid(), exId: id, rest: t === 'cardio' ? 0 : state.profile.rest, notes: '', sets: t === 'cardio' ? [emptySetFor(t)] : [1, 2, 3].map(() => emptySetFor(t)) }); }
      rerender();
    } }),
    addSet: (el, rerender) => { const e = draft.exercises[+el.closest('[data-i]').dataset.i]; e.sets.push({ ...(e.sets.at(-1) || emptySetFor(getEx(e.exId).type)), type: 'n' }); rerender(); },
    delSet: (el, rerender) => { const e = draft.exercises[+el.closest('[data-i]').dataset.i]; e.sets.splice(+el.closest('[data-j]').dataset.j, 1); rerender(); },
    async exMenu(el, rerender) {
      const i = +el.closest('[data-i]').dataset.i, e = draft.exercises[i];
      const v = await menu(getEx(e.exId).name, [
        { label: 'Tempo de descanso', value: 'rest', icon: 'timer' },
        { label: 'Trocar exercício', value: 'swap', icon: 'swap' },
        { label: 'Técnicas avançadas (drop, pirâmide...)', value: 'tech', icon: 'fire' },
        ...(e.group ? [{ label: 'Desfazer bi-set', value: 'ungroup', icon: 'x' }]
          : i < draft.exercises.length - 1 ? [{ label: `Bi-set com ${getEx(draft.exercises[i + 1].exId).name}`, value: 'group', icon: 'swap' }] : []),
        ...(i > 0 ? [{ label: 'Mover para cima', value: 'up', icon: 'up' }] : []),
        ...(i < draft.exercises.length - 1 ? [{ label: 'Mover para baixo', value: 'down', icon: 'down' }] : []),
        { label: 'Remover', value: 'del', icon: 'trash', danger: true }]);
      if (v === 'rest') {
        const r = await menu('Descanso', [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map(x => ({ label: fmtRest(x), value: String(x) })));
        if (r != null) e.rest = +r;
      }
      if (v === 'swap') return openSwap({ exId: e.exId, exclude: draft.exercises.map(x => x.exId), onPick: id => { e.exId = id; rerender(); } });
      if (v === 'tech') {
        const key = await chooseTechnique();
        if (!key) return;
        e.sets = applyTechnique(key, e.sets, { tgt: x => x, make: (t, type) => ({ type, ...t }), locked: () => false, baseKg: x => x.kg ?? null });
        e.tech = key.startsWith('pyr') ? key : key === 'clear' ? null : e.tech;
      }
      if (v === 'group') linkWithNext(draft.exercises, i);
      if (v === 'ungroup') unlink(draft.exercises, e);
      if (v === 'up' || v === 'down') { const j = v === 'up' ? i - 1 : i + 1; [draft.exercises[i], draft.exercises[j]] = [draft.exercises[j], draft.exercises[i]]; }
      if (v === 'del') { if (e.group) unlink(draft.exercises, e); draft.exercises.splice(i, 1); }
      if (v) rerender();
    }
  }
};
