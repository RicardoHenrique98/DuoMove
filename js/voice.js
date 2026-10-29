// Voz do treinador: fala em português (voz do próprio aparelho) para guiar o cardio
import { state } from './store.js';
import { duckFor } from './ui.js';

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

export function say(text, { interrupt = true } = {}) {
  if (!voiceOn() || !text) return;
  if (interrupt) synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  if (voice) u.voice = voice;
  u.rate = state.profile.voiceRate || 1.02;
  // Música abaixa durante a fala (tempo estimado pelo tamanho da frase) e volta depois
  duckFor(1500 + text.length * 70);
  u.onend = () => duckFor(400);
  synth.speak(u);
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

// Prévia: uma sequência curta com os comandos do treino
export function preview() {
  unlockVoice();
  pickVoice();
  const lines = [
    'Oi! Eu sou o seu treinador no Duo Move.',
    'Boa! Descanse 1 minuto e meio.',
    'Faltam 10 segundos. Próximo: supino reto, série 2 de 4: 8 a 10 repetições com 40 quilos.',
    'Vai! Corra 1 minuto em ritmo leve. Intervalo 2 de 8.'
  ];
  if (!synth) return false;
  synth.cancel();
  lines.forEach((t, i) => {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'pt-BR'; if (voice) u.voice = voice; u.rate = state.profile.voiceRate || 1.02;
    if (i === 0) duckFor(9000);
    synth.speak(u);
  });
  return true;
}
