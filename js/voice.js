// Voz do treinador: fala em português (voz do próprio aparelho) para guiar o cardio
import { state } from './store.js';
import { duckFor } from './ui.js';

let voice = null;
const synth = globalThis.speechSynthesis;

function pickVoice() {
  const list = synth?.getVoices() || [];
  voice = list.find(v => v.lang === 'pt-BR') || list.find(v => v.lang?.startsWith('pt')) || null;
}
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
  u.rate = 1.02;
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
