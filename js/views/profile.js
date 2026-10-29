import { state, save, exportData, replaceState, resetState } from '../store.js';
import { esc, fmtRest, fmtDate } from '../util.js';
import { icon, menu, confirmBox, toast } from '../ui.js';
import { rerender } from '../router.js';
import { applyTheme } from '../theme.js';
import { SEXES, FOCUS } from '../planner.js';

const GOALS = ['Ganhar força', 'Ganhar massa muscular', 'Emagrecer', 'Ganhar condicionamento', 'Melhorar saúde e bem-estar', 'Preparar-me para uma prova'];

export function render() {
  const p = state.profile;
  return `<div class="page-head"><div><div class="eyebrow">Seu espaço</div><h1>Perfil</h1></div></div>
    <section class="card">
      <label class="field"><span>Como quer ser chamado?</span><input data-f="name" value="${esc(p.name)}" maxlength="40" placeholder="Seu nome"></label>
      <label class="field"><span>Sexo</span><select data-f="sex"><option value="">Não informado</option>${Object.entries(SEXES).map(([k, v]) => `<option value="${k}" ${p.sex === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field"><span>Prioridade do treino</span><select data-f="focus">${Object.entries(FOCUS).map(([k, v]) => `<option value="${k}" ${(p.focus || 'equilibrado') === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label>
      <label class="field"><span>Objetivo principal</span><select data-f="goal">${GOALS.map(g => `<option ${p.goal === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
      <label class="field"><span>Objetivo secundário</span><select data-f="goal2"><option value="">Nenhum</option>${GOALS.filter(g => g !== p.goal).map(g => `<option ${p.goal2 === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
      <button class="setting" data-act="rest"><span>Descanso padrão entre séries</span><b>${fmtRest(p.rest)}</b></button>
      <label class="setting"><span>Sugestões de carga do treinador</span><input type="checkbox" data-f="coach" ${p.coach !== false ? 'checked' : ''}></label>
      <button class="setting" data-act="theme"><span>Tema</span><b>${{ dark: 'Escuro', light: 'Claro (creme)', auto: 'Automático' }[p.theme || 'dark']}</b></button>
      <label class="setting"><span>Voz do treinador nos comandos (descanso, próxima série, cardio)</span><input type="checkbox" data-f="voice" ${p.voice !== false ? 'checked' : ''}></label>
      <label class="setting"><span>Bipes junto com a voz (3, 2, 1 e fim)</span><input type="checkbox" data-f="sound" ${p.sound ? 'checked' : ''}></label>
    </section>
    <section class="card">
      <b>Backup dos seus dados</b>
      <p class="muted small">Seus treinos ficam guardados só neste aparelho. Exporte de vez em quando para não perder nada, e importe para passar para outro celular.</p>
      <div class="row gap"><button class="btn soft grow" data-act="export">${icon('download', 16)} Exportar</button>
        <label class="btn soft grow">${icon('upload', 16)} Importar<input type="file" accept="application/json,.json" data-f="import" hidden></label></div>
      ${p.lastBackup ? `<p class="muted small">Último backup: ${fmtDate(p.lastBackup, { day: '2-digit', month: 'long', year: 'numeric' })}</p>` : ''}
    </section>
    <button class="btn danger-ghost block" data-act="reset">Apagar todos os dados</button>
    <p class="footnote">Duo Move organiza seus treinos e não substitui a orientação de um profissional de educação física ou de saúde. Respeite seus limites e interrompa a atividade se sentir dor, tontura ou mal-estar.</p>`;
}

export function input(el) {
  const f = el.dataset.f;
  if (['name', 'goal', 'goal2', 'sex', 'focus'].includes(f)) state.profile[f] = el.value;
  if (f === 'goal' && state.profile.goal2 === el.value) state.profile.goal2 = '';
  if (f === 'sound') state.profile.sound = el.checked;
  if (f === 'coach') state.profile.coach = el.checked;
  if (f === 'voice') state.profile.voice = el.checked;
  if (f === 'import') return importFile(el.files[0]);
  save();
}

async function importFile(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'duo-move' || !Array.isArray(data.workouts)) throw new Error();
    if (!(await confirmBox('Importar backup?', `Isso substitui os dados atuais por ${data.workouts.length} treinos do arquivo.`, 'Importar'))) return;
    delete data.app; delete data.exported;
    replaceState(data);
    toast('Backup importado');
    rerender();
  } catch {
    toast('Arquivo inválido');
  }
}

export const actions = {
  async theme(el, rr) {
    const v = await menu('Tema', [{ label: 'Escuro (padrão)', value: 'dark' }, { label: 'Claro (creme Duo)', value: 'light' }, { label: 'Automático (segue o celular)', value: 'auto' }]);
    if (!v) return;
    state.profile.theme = v; save(); applyTheme(); rr();
  },
  async rest(el, rr) {
    const v = await menu('Descanso padrão', [30, 45, 60, 75, 90, 120, 150, 180, 240].map(x => ({ label: fmtRest(x), value: String(x) })));
    if (v) { state.profile.rest = +v; save(); rr(); }
  },
  export() {
    state.profile.lastBackup = Date.now();
    save();
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `duo-move-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    rerender();
  },
  async reset() {
    if (!(await confirmBox('Apagar tudo?', 'Treinos, rotinas e exercícios criados serão apagados deste aparelho. Não dá para desfazer.', 'Apagar tudo', true))) return;
    resetState(); rerender(); toast('Dados apagados');
  }
};
