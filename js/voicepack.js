// Pacote de vozes naturais: áudios gerados uma vez (tools/gerar-vozes.mjs), publicados junto com o app
// e baixados para o aparelho quando há internet. Depois disso o treinador fala mesmo offline.
import { state, save } from './store.js';
import { audioCtx, unlockAudio, duckFor } from './ui.js';
import { toClips } from './voicecatalog.js';

const BASE = 'data/voz/';
const cacheName = v => 'duo-move-voz-' + v;
let INDEX = null, ready = null, buffers = new Map();

// Vozes disponíveis (data/voz/index.json, criado pelo gerador). Sem pacote publicado: lista vazia.
export async function voicePacks() {
  if (INDEX) return INDEX;
  try { INDEX = (await (await fetch(BASE + 'index.json', { cache: 'no-cache' })).json()).voices || []; } catch { INDEX = []; }
  return INDEX;
}

async function manifest(v) {
  return (await fetch(`${BASE}${v}/manifest.json`, { cache: 'no-cache' })).json();
}

// Baixa (ou atualiza) o pacote da voz escolhida para o armazenamento do aparelho
export async function downloadPack(v, onProgress) {
  const m = await manifest(v), files = Object.values(m.files), cache = await caches.open(cacheName(v));
  let done = 0;
  for (const f of files) {
    const url = `${BASE}${v}/${f}`;
    if (!(await cache.match(url))) { const r = await fetch(url); if (!r.ok) throw new Error(url); await cache.put(url, r); }
    onProgress?.(++done, files.length);
  }
  state.profile.voicePackReady = { voice: v, version: m.version };
  save();
  ready = null;
  return m;
}

// Baixa sozinho quando há internet e a voz escolhida ainda não está no aparelho (ou mudou de versão)
export async function syncPack() {
  const v = state.profile.voicePack;
  if (!v || !navigator.onLine) return;
  try {
    const m = await manifest(v);
    if (state.profile.voicePackReady?.voice === v && state.profile.voicePackReady.version === m.version) return;
    await downloadPack(v);
  } catch { /* tenta de novo na próxima abertura */ }
}

async function loadReady() {
  const v = state.profile.voicePack, r = state.profile.voicePackReady;
  if (!v || r?.voice !== v || !globalThis.caches) return null;
  try { const m = await (await caches.match(`${BASE}${v}/manifest.json`) || await fetch(`${BASE}${v}/manifest.json`)).json(); return { v, m }; } catch { return null; }
}

async function buffer(v, file) {
  const key = v + '/' + file;
  if (buffers.has(key)) return buffers.get(key);
  const cache = await caches.open(cacheName(v));
  const res = await cache.match(`${BASE}${v}/${file}`);
  if (!res) throw new Error('faltando ' + file);
  const buf = await audioCtx().decodeAudioData(await res.arrayBuffer());
  buffers.set(key, buf);
  return buf;
}

/**
 * Tenta falar com o pacote de vozes. Devolve true se tocou; false para cair na voz do aparelho
 * (sem pacote, trecho que não existe no pacote, ou som bloqueado).
 */
export async function speakPack(text) {
  if (!state.profile.voicePack) return false;
  ready ||= loadReady();
  const pk = await ready;
  if (!pk) return false;
  const clips = toClips(text);
  if (!clips || clips.some(c => !pk.m.files[c.id])) return false;
  unlockAudio();
  const ctx = audioCtx();
  if (!ctx) return false;
  try {
    const bufs = await Promise.all(clips.map(c => buffer(pk.v, pk.m.files[c.id])));
    let t = ctx.currentTime + 0.05;
    stopPack();
    bufs.forEach((b, i) => {
      const src = ctx.createBufferSource();
      src.buffer = b; src.connect(ctx.destination); src.start(t);
      playing.push(src);
      t += b.duration + (clips[i].pause ? 0.22 : 0.04);
    });
    duckFor((t - ctx.currentTime) * 1000 + 400);
    return true;
  } catch {
    return false;
  }
}

let playing = [];
export function stopPack() { playing.forEach(s => { try { s.stop(); } catch { /* já parou */ } }); playing = []; }
