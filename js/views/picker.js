// Seletor de exercícios (busca + filtro por músculo) e criação de exercício próprio
import { state, save, allExercises, addCustomExercise } from '../store.js';
import { MUSCLES, EQUIP, TYPES, imgUrl, IMG_ERR } from '../data.js';
import { esc, norm } from '../util.js';
import { sheet, icon, toast } from '../ui.js';
import { alternatives } from '../planner.js';

// Busca por todas as palavras (em qualquer ordem); exercícios curados aparecem primeiro
// Cada palavra precisa bater com o início de uma palavra do nome, músculo, equipamento ou marca
const tokens = txt => norm(txt).split(/[^a-z0-9]+/).filter(Boolean);
export function filterExercises(q, muscle) {
  const words = tokens(q);
  return allExercises()
    .filter(e => {
      if (muscle && e.muscle !== muscle) return false;
      if (!words.length) return true;
      const t = tokens(`${e.name} ${MUSCLES[e.muscle] || ''} ${EQUIP[e.equip] || ''} ${e.brand || ''}`);
      return words.every(w => t.some(x => x.startsWith(w)));
    })
    .sort((a, b) => (a.extra ? 1 : 0) - (b.extra ? 1 : 0) || a.name.localeCompare(b.name, 'pt-BR'));
}

const LIMIT = 120;
export const limited = list => list.length > LIMIT
  ? { items: list.slice(0, LIMIT), more: `<div class="empty small">Mostrando ${LIMIT} de ${list.length}. Busque pelo nome ou filtre por músculo para ver os demais.</div>` }
  : { items: list, more: '' };

export const exerciseRow = (e, attrs = '', right = '') => `<button class="ex-row" ${attrs}>
  ${e.photo ? `<img class="ex-thumb" src="${e.photo}" alt="">` : e.img ? `<img class="ex-thumb" src="${imgUrl(e.img, 0)}" alt="" loading="lazy" decoding="async" ${IMG_ERR}>` : `<span class="ex-badge">${esc((e.name.match(/[A-Za-zÀ-ÿ]/) || ['?'])[0].toUpperCase())}</span>`}
  <span class="grow"><b>${esc(e.name)}</b><small>${esc(MUSCLES[e.muscle] || '')} · ${esc(EQUIP[e.equip] || '')}${e.brand ? ' · ' + esc(e.brand) : ''}${e.custom ? ' · seu' : ''}</small></span>${right}</button>`;

export const muscleChips = (active, act = 'muscle') => `<div class="chips scroll-x">
  <button class="chip ${!active ? 'on' : ''}" data-act="${act}" data-m="">Todos</button>
  ${Object.entries(MUSCLES).map(([k, v]) => `<button class="chip ${active === k ? 'on' : ''}" data-act="${act}" data-m="${k}">${esc(v)}</button>`).join('')}</div>`;

export function openPicker({ title = 'Adicionar exercícios', multi = true, muscle = null, onDone }) {
  let q = '', m = muscle;
  const chosen = [];
  const list = () => { const { items, more } = limited(filterExercises(q, m)); return items.map(e => {
    const i = chosen.indexOf(e.id);
    return exerciseRow(e, `data-act="toggle" data-id="${e.id}" aria-pressed="${i >= 0}"`, i >= 0 ? `<span class="pick-n">${multi ? i + 1 : icon('check', 16)}</span>` : '');
  }).join('') + more + `<button class="ex-row create-row" data-act="create">${icon('plus', 18)}<span class="grow"><b>${q ? `Criar “${esc(q)}”` : 'Não achou? Crie seu exercício'}</b><small>Ex.: uma máquina da sua academia, com foto</small></span></button>`; };

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
    <div class="sheet-foot"><button class="btn primary block" data-act="done" disabled>Selecione exercícios</button></div>`, {
    input: (el, api) => { if (el.dataset.f === 'q') { q = el.value; paint(api); } },
    muscle: (el, api) => { m = el.dataset.m || null; paint(api); },
    toggle: (el, api) => {
      const id = el.dataset.id, i = chosen.indexOf(id);
      if (!multi) { api.close(); onDone([id]); return; }
      i >= 0 ? chosen.splice(i, 1) : chosen.push(id);
      paint(api);
    },
    create: (el, api) => openCreate({ name: q, muscle: m, onCreated: ex => { chosen.push(ex.id); if (!multi) { api.close(); onDone([ex.id]); } else paint(api); } }),
    done: (el, api) => { api.close(); onDone(chosen); }
  }, { full: true });
  paint(s);
}

// Reduz a foto para ~320px (JPEG) para caber no armazenamento do aparelho
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 320 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Criar (ou editar) exercício próprio — ex.: uma máquina que não está na biblioteca
export function openCreate({ name = '', muscle = null, existing = null, onCreated } = {}) {
  const e = existing || {};
  let photo = e.photo || null;
  const opts = (obj, sel) => Object.entries(obj).filter(([k]) => k !== 'atividade').map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
  const thumb = () => photo ? `<img src="${photo}" alt="">` : icon('upload', 22);
  sheet(`<h3 class="sheet-title">${existing ? 'Editar exercício' : 'Novo exercício'}</h3>
    <label class="photo-pick"><span class="photo-box">${thumb()}</span><span><b>Foto do aparelho</b><small>Opcional: ajuda a reconhecer a máquina na academia</small></span><input type="file" accept="image/*" data-f="photo" hidden></label>
    <label class="field"><span>Nome</span><input data-f="name" value="${esc(e.name || name)}" maxlength="60" placeholder="Ex.: Elevação lateral na máquina"></label>
    <label class="field"><span>Marca do aparelho (opcional)</span><input data-f="brand" value="${esc(e.brand || '')}" maxlength="40" placeholder="Ex.: Impulse, Technogym, Matrix"></label>
    <div class="row gap"><button class="btn soft grow" data-act="web">${icon('search', 16)} Pesquisar na internet</button><button class="btn soft grow" data-act="paste">${icon('copy', 16)} Colar imagem</button></div>
    <p class="muted small">Na pesquisa, toque e segure a foto da máquina → Copiar. Volte aqui e toque em “Colar imagem”. Ou salve a foto e escolha pela galeria no quadrado acima.</p>
    <label class="field"><span>Músculo principal</span><select data-f="muscle">${opts(MUSCLES, e.muscle || muscle || 'peito')}</select></label>
    <label class="field"><span>Equipamento</span><select data-f="equip">${opts(EQUIP, e.equip || 'maquina')}</select></label>
    <label class="field"><span>Como registrar</span><select data-f="type">${opts(TYPES, e.type || 'peso')}</select></label>
    <label class="field"><span>Dica de execução (opcional)</span><input data-f="tip" value="${esc(e.tip || '')}" maxlength="140" placeholder="Ex.: banco na altura 4, pegada neutra"></label>
    <div class="row gap"><button class="btn ghost grow" data-act="close">Cancelar</button><button class="btn primary grow" data-act="save">${existing ? 'Salvar' : 'Criar'}</button></div>`, {
    input: async (el, api) => {
      if (el.dataset.f !== 'photo' || !el.files[0]) return;
      try { photo = await shrinkPhoto(el.files[0]); api.el.querySelector('.photo-box').innerHTML = thumb(); } catch { toast('Não foi possível usar essa foto'); }
    },
    web: (el, api) => {
      const v = f => api.el.querySelector(`[data-f="${f}"]`).value.trim();
      const q = [v('name') || 'máquina', v('brand'), 'máquina academia'].filter(Boolean).join(' ');
      window.open('https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q), '_blank');
    },
    async paste(el, api) {
      try {
        const items = await navigator.clipboard.read();
        for (const it of items) {
          const type = it.types.find(t => t.startsWith('image/'));
          if (type) { photo = await shrinkPhoto(await it.getType(type)); api.el.querySelector('.photo-box').innerHTML = thumb(); return toast('Foto adicionada'); }
        }
        toast('Nenhuma imagem copiada. Na pesquisa, toque e segure a foto → Copiar');
      } catch {
        toast('Não consegui colar. Salve a foto no celular e escolha pela galeria');
      }
    },
    save: (el, api) => {
      const v = f => api.el.querySelector(`[data-f="${f}"]`).value.trim();
      if (!v('name')) return toast('Dê um nome ao exercício');
      const data = { name: v('name'), brand: v('brand'), muscle: v('muscle'), equip: v('equip'), type: v('type'), tip: v('tip'), photo };
      let ex;
      if (existing) { ex = state.custom.find(x => x.id === existing.id); Object.assign(ex, data); save(); }
      else ex = addCustomExercise(data);
      api.close();
      toast(existing ? 'Exercício atualizado' : 'Exercício criado');
      onCreated?.(ex);
    }
  });
}

// Troca sugerida pelo treinador: substitutos já ordenados; a biblioteca fica como última opção
export function openSwap({ exId, exclude = [], onPick }) {
  const ex = allExercises().find(e => e.id === exId) || { name: 'exercício', muscle: null };
  const alts = alternatives(exId, { exclude });
  const s = sheet(`<div class="sheet-head"><h3 class="sheet-title">Trocar ${esc(ex.name)}</h3><button class="icon-btn" data-act="close" aria-label="Fechar">${icon('x')}</button></div>
    <p class="muted small">O treinador escolheu os melhores substitutos para manter o estímulo do treino.</p>
    <div class="swap-list">${alts.map((a, i) => {
      const x = allExercises().find(e => e.id === a.id);
      return `<button class="swap-opt ${i === 0 ? 'best' : ''}" data-act="pick" data-id="${a.id}">
        ${i === 0 ? `<span class="swap-badge">${icon('bulb', 13)} Recomendado pelo treinador</span>` : ''}
        ${exerciseRow(x).replace(/^<button class="ex-row"\s*>/, '<span class="ex-row">').replace(/<\/button>$/, '</span>')}
        <small class="swap-why">${esc(a.why)}</small></button>`;
    }).join('') || '<div class="empty small">Sem substitutos com o seu equipamento. Escolha na biblioteca.</div>'}</div>
    <button class="btn ghost block" data-act="library">${icon('search', 16)} Escolher outro na biblioteca</button>
    <button class="btn ghost block" data-act="create">${icon('plus', 16)} Criar exercício (ex.: máquina da academia)</button>`, {
    pick: (el, api) => { api.close(); onPick(el.dataset.id); },
    create: (el, api) => { api.close(); openCreate({ muscle: ex.muscle, onCreated: x => onPick(x.id) }); },
    library: (el, api) => { api.close(); openPicker({ title: `Trocar ${ex.name}`, multi: false, muscle: ex.muscle, onDone: ([id]) => onPick(id) }); }
  });
  return s;
}
