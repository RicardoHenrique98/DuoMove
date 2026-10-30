import { state, save, exportData, replaceState, resetState } from '../store.js';
import { esc, fmtRest, fmtDate } from '../util.js';
import { icon, menu, confirmBox, toast, sheet } from '../ui.js';
import { rerender } from '../router.js';
import { applyTheme } from '../theme.js';
import { SEXES, FOCUS } from '../planner.js';
import { preview, ptVoices, refreshVoice } from '../voice.js';
import { voicePacks, downloadPack } from '../voicepack.js';

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
      ${p.voice !== false ? `<div class="voice-opts">
        <button class="btn soft block" data-act="preview">${icon('play', 16)} Ouvir prévia da voz</button>
        <div id="voicepack"></div>
        <button class="setting" data-act="voicePick"><span>Voz do aparelho (reserva)</span><b>${esc(p.voiceName || 'Padrão do aparelho')}</b></button>
        <button class="setting" data-act="voiceRate"><span>Velocidade da fala</span><b>${{ 0.9: 'Mais calma', 1.02: 'Normal', 1.15: 'Mais rápida' }[p.voiceRate || 1.02] || 'Normal'}</b></button>
      </div>` : ''}
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

export function mount() { paintPacks(); }

export function input(el) {
  const f = el.dataset.f;
  if (['name', 'goal', 'goal2', 'sex', 'focus'].includes(f)) state.profile[f] = el.value;
  if (f === 'goal' && state.profile.goal2 === el.value) state.profile.goal2 = '';
  if (f === 'sound') state.profile.sound = el.checked;
  if (f === 'coach') state.profile.coach = el.checked;
  if (f === 'voice') { state.profile.voice = el.checked; save(); return rerender(); }
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

// Vozes naturais (pacote baixado para usar offline)
async function paintPacks() {
  const box = document.getElementById('voicepack');
  if (!box) return;
  const packs = await voicePacks();
  if (!packs.length) { box.innerHTML = ''; return; }
  const p = state.profile, readyV = p.voicePackReady?.voice;
  box.innerHTML = `<div class="packs"><b>Voz natural do treinador</b><small class="muted">Baixada uma vez no aparelho: funciona sem internet na academia.</small>
    ${packs.map(v => `<div class="pack ${p.voicePack === v.id ? 'on' : ''}">
      <button class="icon-btn" data-act="packSample" data-v="${v.id}" aria-label="Ouvir amostra de ${esc(v.name)}">${icon('play', 16)}</button>
      <button class="grow pack-pick" data-act="packPick" data-v="${v.id}"><b>${esc(v.name)}</b><small>${p.voicePack === v.id ? (readyV === v.id ? 'Baixada ✓ funciona offline' : '<span data-pack-status>Baixando…</span>') : 'Toque para usar'}</small></button></div>`).join('')}
    <button class="pack ${!p.voicePack ? 'on' : ''} pack-pick" data-act="packPick" data-v=""><span class="grow"><b>Voz do aparelho</b><small>Sem download</small></span></button></div>`;
}

const sheetInfo = (title, text) => sheet(`<h3 class="sheet-title">${esc(title)}</h3><p class="muted">${esc(text)}</p><button class="btn primary block" data-act="close">Entendi</button>`);

export const actions = {
  async theme(el, rr) {
    const v = await menu('Tema', [{ label: 'Escuro (padrão)', value: 'dark' }, { label: 'Claro (creme Duo)', value: 'light' }, { label: 'Automático (segue o celular)', value: 'auto' }]);
    if (!v) return;
    state.profile.theme = v; save(); applyTheme(); rr();
  },
  packSample(el) { new Audio(`data/voz/amostras/${el.dataset.v}.m4a`).play().catch(() => toast('Amostra indisponível')); },
  async packPick(el) {
    const v = el.dataset.v;
    state.profile.voicePack = v; save(); await paintPacks();
    if (!v) return toast('Usando a voz do aparelho');
    if (state.profile.voicePackReady?.voice === v) return preview();
    try {
      await downloadPack(v, (d, n) => { const st = document.querySelector('[data-pack-status]'); if (st) st.textContent = `Baixando ${d} de ${n}…`; });
      await paintPacks(); toast('Voz baixada: funciona offline'); preview();
    } catch { toast('Sem internet agora. A voz baixa sozinha quando você estiver conectado.'); }
  },
  preview() {
    const ok = preview(() => sheetInfo('Não saiu som?', 'Confira: 1) a chavinha lateral do iPhone não está no modo silencioso (laranja); 2) o volume está alto; 3) em Ajustes → Acessibilidade → Conteúdo Falado → Vozes, existe uma voz em Português (Brasil) baixada. Depois toque em “Ouvir prévia” de novo.'));
    if (!ok) toast('Este aparelho não tem voz disponível');
  },
  async voicePick(el, rr) {
    const list = ptVoices();
    if (!list.length) return toast('Nenhuma voz em português encontrada no aparelho');
    const v = await menu('Voz do treinador', [{ label: 'Padrão do aparelho', value: '_' }, ...list.map(x => ({ label: `${x.name}${x.lang === 'pt-BR' ? '' : ' (' + x.lang + ')'}`, value: x.name }))]);
    if (!v) return;
    state.profile.voiceName = v === '_' ? '' : v; save(); refreshVoice(); rr(); preview();
  },
  async voiceRate(el, rr) {
    const v = await menu('Velocidade da fala', [{ label: 'Mais calma', value: '0.9' }, { label: 'Normal', value: '1.02' }, { label: 'Mais rápida', value: '1.15' }]);
    if (!v) return;
    state.profile.voiceRate = +v; save(); rr(); preview();
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
