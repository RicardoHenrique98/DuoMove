// Voz do treinador: fala em português (voz do próprio aparelho) para guiar o cardio
import { state } from './store.js';
import { duckFor } from './ui.js';
import { speakPack, stopPack } from './voicepack.js';

let voice = null;
const synth = globalThis.speechSynthesis;

// Vozes em português disponíveis no aparelho (a escolhida no perfil tem prioridade)
export const ptVoices = () => (synth?.getVoices() || []).filter(v => v.lang?.replace('_', '-').startsWith('pt')).sort((a, b) => (b.lang === 'pt-BR') - (a.lang === 'pt-BR'));
function pickVoice() {
  const list = ptVoices(), want = state.profile?.voiceName;
  voice = list.find(v => v.name === want) || list.find(v => v.lang === 'pt-BR') || list[0] || null;
}
export const refreshVoice = pickVoice;
synth?.addEventListener?.('voiceschanged', pickVoice);
pickVoice();

export const voiceOn = () => !!synth && state.profile.voice !== false;

// O iPhone só libera a voz depois de um toque do usuário: chamar dentro de um clique
export function unlockVoice() {
  if (!synth || unlockVoice.done) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  synth.speak(u);
  unlockVoice.done = true;
}

function utter(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  if (voice) u.voice = voice;
  u.rate = state.profile.voiceRate || 1.02;
  return u;
}

// O Safari do iPhone descarta a fala se ela vem logo depois de um cancel(): só cancela
// quando há algo falando e espera um instante antes de falar de novo
let talking = 0; // falas nossas em andamento (a fala silenciosa de liberação não conta)
function speakAll(texts, onStart) {
  const go = () => texts.forEach((t, i) => {
    const u = utter(t);
    talking++;
    if (i === 0 && onStart) u.onstart = onStart;
    u.onend = u.onerror = () => { talking = Math.max(0, talking - 1); if (!talking) duckFor(400); };
    synth.speak(u);
  });
  duckFor(1500 + texts.join(' ').length * 70);
  // Fala direto (dentro do toque, como o iPhone exige); só interrompe se uma fala nossa estiver tocando
  if (talking) { synth.cancel(); talking = 0; setTimeout(go, 150); } else go();
}

// Voz natural do pacote quando estiver baixado; senão, a voz do aparelho
export function say(text) {
  if (!voiceOn() || !text) return;
  if (talking) { synth.cancel(); talking = 0; }
  speakPack(text).then(ok => { if (!ok) speakAll([text]); });
}

// "1 minuto e meio", "30 segundos", "5 minutos"
export function sayDuration(min) {
  if (min < 1) return `${Math.round(min * 60)} segundos`;
  const whole = Math.floor(min), half = Math.abs(min - whole - 0.5) < 0.01;
  const base = whole === 1 ? '1 minuto' : `${whole} minutos`;
  if (half) return `${base} e meio`;
  const sec = Math.round((min - whole) * 60);
  return sec ? `${base} e ${sec} segundos` : base;
}

const VERB = { corrida: 'Corra', esteira: 'Corra na esteira', caminhada: 'Caminhe', pedal: 'Pedale', bike: 'Pedale', eliptico: 'Siga no elíptico', remo: 'Reme', escada: 'Suba no simulador' };
export const actionVerb = exId => VERB[exId] || 'Vai';

// Prévia: uma sequência curta com os comandos do treino. Se não começar a falar em
// alguns segundos, avisa o motivo mais comum (modo silencioso)
export function preview(onSilent) {
  if (!synth) return false;
  pickVoice();
  let started = false;
  const lines = [
    'Oi! Eu sou o seu treinador no Duo Move.',
    'Boa! Descanse 1 minuto e meio.',
    'Faltam 10 segundos. Próximo: Supino reto, série 2 de 4: 8 a 10 repetições com 40 quilos.',
    'Vai! Corra 1 minuto em ritmo leve. Intervalo 2 de 8.'
  ];
  if (state.profile.voicePackReady?.voice && state.profile.voicePackReady.voice === state.profile.voicePack) {
    speakPack(lines.join(' ')).then(ok => { if (ok) started = true; else speakAll(lines, () => { started = true; }); });
  } else speakAll(lines, () => { started = true; });
  setTimeout(() => { if (!started && !synth.speaking) onSilent?.(); }, 2500);
  return true;
}
