// Seletor de exercícios (busca + filtro por músculo) e criação de exercício próprio
import { allExercises, addCustomExercise } from '../store.js';
import { MUSCLES, EQUIP, TYPES, imgUrl, IMG_ERR } from '../data.js';
import { esc, norm } from '../util.js';
import { sheet, icon, toast } from '../ui.js';

// Busca por todas as palavras (em qualquer ordem); exercícios curados aparecem primeiro
export function filterExercises(q, muscle) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  return allExercises()
    .filter(e => (!muscle || e.muscle === muscle) && words.every(w => norm(e.name).includes(w) || norm(MUSCLES[e.muscle] || '').includes(w) || norm(EQUIP[e.equip] || '').includes(w)))
    .sort((a, b) => (a.extra ? 1 : 0) - (b.extra ? 1 : 0) || a.name.localeCompare(b.name, 'pt-BR'));
}

const LIMIT = 120;
export const limited = list => list.length > LIMIT
  ? { items: list.slice(0, LIMIT), more: `<div class="empty small">Mostrando ${LIMIT} de ${list.length}. Busque pelo nome ou filtre por músculo para ver os demais.</div>` }
  : { items: list, more: '' };

export const exerciseRow = (e, attrs = '', right = '') => `<button class="ex-row" ${attrs}>
  ${e.img ? `<img class="ex-thumb" src="${imgUrl(e.img, 0)}" alt="" loading="lazy" decoding="async" ${IMG_ERR}>` : `<span class="ex-badge">${esc((e.name.match(/[A-Za-zÀ-ÿ]/) || ['?'])[0].toUpperCase())}</span>`}
  <span class="grow"><b>${esc(e.name)}</b><small>${esc(MUSCLES[e.muscle] || '')} · ${esc(EQUIP[e.equip] || '')}${e.custom ? ' · seu' : ''}</small></span>${right}</button>`;

export const muscleChips = (active, act = 'muscle') => `<div class="chips scroll-x">
  <button class="chip ${!active ? 'on' : ''}" data-act="${act}" data-m="">Todos</button>
  ${Object.entries(MUSCLES).map(([k, v]) => `<button class="chip ${active === k ? 'on' : ''}" data-act="${act}" data-m="${k}">${esc(v)}</button>`).join('')}</div>`;

export function openPicker({ title = 'Adicionar exercícios', multi = true, muscle = null, onDone }) {
  let q = '', m = muscle;
  const chosen = [];
  const list = () => { const { items, more } = limited(filterExercises(q, m)); return items.map(e => {
    const i = chosen.indexOf(e.id);
    return exerciseRow(e, `data-act="toggle" data-id="${e.id}" aria-pressed="${i >= 0}"`, i >= 0 ? `<span class="pick-n">${multi ? i + 1 : icon('check', 16)}</span>` : '');
  }).join('') + more || `<div class="empty">Nada encontrado. Crie o exercício abaixo.</div>`; };

  const paint = api => {
    api.el.querySelector('.pick-list').innerHTML = list();
    api.el.querySelector('.pick-chips').innerHTML = muscleChips(m);
    const btn = api.el.querySelector('[data-act="done"]');
    btn.disabled = !chosen.length;
    btn.textContent = chosen.length ? `Adicionar ${chosen.length > 1 ? chosen.length + ' exercícios' : 'exercício'}` : 'Selecione exercícios';
  };

  const s = sheet(`<div class="sheet-head"><h3 class="sheet-title">${esc(title)}</h3><button class="icon-btn" data-act="close" aria-label="Fechar">${icon('x')}</button></div>
    <label class="search">${icon('search', 18)}<input type="search" placeholder="Buscar exercício" data-f="q" autocomplete="off"></label>
    <div class="pick-chips"></div>
    <div class="pick-list"></div>
    <button class="btn ghost block" data-act="create">${icon('plus', 18)} Criar exercício</button>
    <div class="sheet-foot"><button class="btn primary block" data-act="done" disabled>Selecione exercícios</button></div>`, {
    input: (el, api) => { if (el.dataset.f === 'q') { q = el.value; paint(api); } },
    muscle: (el, api) => { m = el.dataset.m || null; paint(api); },
    toggle: (el, api) => {
      const id = el.dataset.id, i = chosen.indexOf(id);
      if (!multi) { api.close(); onDone([id]); return; }
      i >= 0 ? chosen.splice(i, 1) : chosen.push(id);
      paint(api);
    },
    create: (el, api) => openCreate(q, m, ex => { chosen.push(ex.id); if (!multi) { api.close(); onDone([ex.id]); } else paint(api); }),
    done: (el, api) => { api.close(); onDone(chosen); }
  }, { full: true });
  paint(s);
}

export function openCreate(name = '', muscle = null, onCreated) {
  const opts = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
  sheet(`<h3 class="sheet-title">Novo exercício</h3>
    <label class="field"><span>Nome</span><input data-f="name" value="${esc(name)}" maxlength="60" placeholder="Ex.: Supino na máquina articulada"></label>
    <label class="field"><span>Músculo principal</span><select data-f="muscle">${opts(MUSCLES, muscle || 'peito')}</select></label>
    <label class="field"><span>Equipamento</span><select data-f="equip">${opts(EQUIP, 'maquina')}</select></label>
    <label class="field"><span>Como registrar</span><select data-f="type">${opts(TYPES, 'peso')}</select></label>
    <div class="row gap"><button class="btn ghost grow" data-act="close">Cancelar</button><button class="btn primary grow" data-act="save">Criar</button></div>`, {
    save: (el, api) => {
      const v = f => api.el.querySelector(`[data-f="${f}"]`).value.trim();
      if (!v('name')) return toast('Dê um nome ao exercício');
      const ex = addCustomExercise({ name: v('name'), muscle: v('muscle'), equip: v('equip'), type: v('type') });
      api.close();
      toast('Exercício criado');
      onCreated?.(ex);
    }
  });
}
