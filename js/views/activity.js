// Registro rápido de atividades (futebol, natação, yoga...): entram no histórico e o treinador leva em conta
import { state, save, getEx } from '../store.js';
import { esc, num, uid, DAY } from '../util.js';
import { sheet, toast } from '../ui.js';

const QUICK = ['corrida', 'pedal', 'caminhada', 'natacao', 'futebol', 'futsal', 'beach-tennis', 'tenis', 'basquete', 'volei', 'crossfit', 'funcional', 'luta', 'danca', 'yoga', 'pilates', 'trilha', 'escalada', 'surf'];
const DISTANCE = new Set(['corrida', 'pedal', 'caminhada', 'natacao', 'trilha']);
const RPE = [[1, 'Leve'], [2, 'Moderada'], [3, 'Intensa']];

export function openActivityLog(onSaved) {
  const f = { exId: null, min: 60, km: null, rpe: 2, day: 0 };
  const paint = api => {
    api.el.querySelectorAll('[data-a]').forEach(b => b.classList.toggle('on', b.dataset.a === f.exId));
    api.el.querySelectorAll('[data-rpe]').forEach(b => b.classList.toggle('on', +b.dataset.rpe === f.rpe));
    api.el.querySelectorAll('[data-day]').forEach(b => b.classList.toggle('on', +b.dataset.day === f.day));
    api.el.querySelector('.km-field').hidden = !DISTANCE.has(f.exId);
    api.el.querySelector('[data-act="save"]').disabled = !f.exId;
  };
  const s = sheet(`<h3 class="sheet-title">Registrar atividade</h3>
    <div class="chips wrap">${QUICK.map(id => `<button class="chip" data-act="pick" data-a="${id}">${esc(getEx(id).name.split(' (')[0])}</button>`).join('')}</div>
    <div class="row gap"><label class="field grow"><span>Duração (min)</span><input data-f="min" inputmode="numeric" value="60"></label>
      <label class="field grow km-field" hidden><span>Distância (km)</span><input data-f="km" inputmode="decimal" placeholder="opcional"></label></div>
    <div class="field"><span>Intensidade</span><div class="chips">${RPE.map(([v, l]) => `<button class="chip" data-act="rpe" data-rpe="${v}">${l}</button>`).join('')}</div></div>
    <div class="field"><span>Quando</span><div class="chips">${[[0, 'Hoje'], [1, 'Ontem'], [2, 'Anteontem']].map(([v, l]) => `<button class="chip" data-act="day" data-day="${v}">${l}</button>`).join('')}</div></div>
    <button class="btn primary block" data-act="save" disabled>Salvar atividade</button>`, {
    pick: (el, api) => { f.exId = el.dataset.a; paint(api); },
    rpe: (el, api) => { f.rpe = +el.dataset.rpe; paint(api); },
    day: (el, api) => { f.day = +el.dataset.day; paint(api); },
    input: el => { if (el.dataset.f) f[el.dataset.f] = num(el.value); },
    save: (el, api) => {
      if (!f.exId || !f.min) return toast('Escolha a atividade e a duração');
      const end = Date.now() - f.day * DAY, start = end - f.min * 60e3;
      state.workouts.push({ id: uid(), name: getEx(f.exId).name.split(' (')[0], kind: 'atividade', rpe: f.rpe, start, end, notes: '',
        exercises: [{ id: uid(), exId: f.exId, rest: 0, notes: '', sets: [{ type: 'n', min: f.min, ...(f.km ? { km: f.km } : {}), done: true }] }] });
      save(); api.close(); toast('Atividade registrada');
      onSaved?.();
    }
  });
  paint(s);
}
