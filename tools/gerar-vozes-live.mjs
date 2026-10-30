// Gera o pacote de vozes do treinador pela Gemini Live (a mesma voz em tempo real do Juca),
// fala por fala, e salva em data/voz/<voz>/ para o app baixar e tocar offline.
// Roda no PC (a nuvem do Claude bloqueia a conexão ao vivo). Precisa do Node 22+ e da chave:
//   set GEMINI_API_KEY=...            (Windows)   ·   export GEMINI_API_KEY=...   (Mac/Linux)
//   node tools/gerar-vozes-live.mjs --vozes Charon,Leda
// Cada fala é conferida por transcrição; se vier diferente do texto, é refeita (até 4 vezes).
// Com ffmpeg instalado salva em .m4a (leve); sem ele, em .wav. É retomável.
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { catalog } from '../js/voicecatalog.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.log('Defina GEMINI_API_KEY antes de rodar.'); process.exit(1); }
const MODEL = arg('modelo', 'gemini-2.5-flash-native-audio-latest');
const CHECK = arg('conferir', 'gemini-3.1-flash-lite');
// O index.json só lista uma voz quando todas as falas dela têm som
const LABEL = { Charon: 'Charon (masculina)', Leda: 'Leda (feminina)' };
const RATE = 24000; // a Live devolve PCM 16 bits, 24 kHz, mono
const HAS_FFMPEG = spawnSync('ffmpeg', ['-version']).status === 0;
const exists = f => access(f).then(() => true, () => false);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SYSTEM = 'Você é a voz de um personal trainer brasileiro: animado, claro, encorajador, sotaque do Brasil. ' +
  'O usuário vai mandar um texto curto. Fale exatamente esse texto, palavra por palavra, uma única vez. ' +
  'Não responda, não comente, não cumprimente, não acrescente nem tire nada. Palavras soltas e números também: fale só eles.';

// Uma sessão Live por fala: manda o texto e junta o áudio até o fim do turno
function live(text, voice, prompt) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${KEY}`);
    const chunks = [], timer = setTimeout(() => { ws.close(); reject(new Error('sem resposta')); }, 30000);
    ws.onopen = () => ws.send(JSON.stringify({ setup: {
      model: 'models/' + MODEL,
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      systemInstruction: { parts: [{ text: SYSTEM }] }
    } }));
    ws.onmessage = async ev => {
      const m = JSON.parse(typeof ev.data === 'string' ? ev.data : await ev.data.text());
      if (m.setupComplete) ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: prompt || !/\s/.test(text.trim()) ? `Diga em voz alta só a palavra "${text}", sozinha, uma única vez.` : `Fale: "${text}"` }] }], turnComplete: true } }));
      for (const p of m.serverContent?.modelTurn?.parts || []) if (p.inlineData) chunks.push(Buffer.from(p.inlineData.data, 'base64'));
      if (m.serverContent?.turnComplete) { clearTimeout(timer); ws.close(); resolve(Buffer.concat(chunks)); }
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('falha na conexão ao vivo')); };
    ws.onclose = e => { if (!chunks.length && e.code !== 1000) { clearTimeout(timer); reject(new Error(`conexão fechada: ${e.code} ${e.reason}`)); } };
  });
}

// Palavra solta a Live costuma ignorar; lista ela fala. Corta nos n-1 silêncios mais longos.
function split(pcm, n) {
  const W = RATE * 0.02, win = Math.floor(pcm.length / 2 / W), quiet = [];
  for (let w = 0; w < win; w++) {
    let sum = 0;
    for (let i = 0; i < W; i++) { const v = pcm.readInt16LE((w * W + i) * 2); sum += v * v; }
    quiet.push(Math.sqrt(sum / W) < 400);
  }
  const gaps = [];
  for (let w = 0, start = -1; w <= win; w++) {
    if (w < win && quiet[w]) { if (start < 0) start = w; }
    else if (start >= 0) { if (start > 0 && w < win && w - start >= 12) gaps.push({ len: w - start, mid: Math.floor((start + w) / 2) }); start = -1; }
  }
  if (gaps.length < n - 1) return null;
  const cuts = gaps.sort((a, b) => b.len - a.len).slice(0, n - 1).map(g => g.mid * W * 2).sort((a, b) => a - b);
  return [0, ...cuts].map((c, k) => trim(pcm.subarray(c, cuts[k] ?? pcm.length)));
}

// Corta o silêncio do começo e do fim (deixa 30 ms e 60 ms)
function trim(pcm) {
  const n = pcm.length / 2, loud = i => Math.abs(pcm.readInt16LE(i * 2)) > 600;
  let a = 0, b = n - 1;
  while (a < n && !loud(a)) a++;
  while (b > a && !loud(b)) b--;
  return pcm.subarray(Math.max(0, a - RATE * 0.03) * 2, Math.min(n, b + RATE * 0.06) * 2);
}

function wav(pcm) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function save(pcm, base) {
  if (!HAS_FFMPEG) { await writeFile(base + '.wav', wav(pcm)); return '.wav'; }
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 's16le', '-ar', String(RATE), '-ac', '1', '-i', 'pipe:0', '-c:a', 'aac', '-b:a', '48k', base + '.m4a'], { input: pcm });
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
  return '.m4a';
}

// Confere a fala: transcreve e compara as palavras com o texto pedido
const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).join(' ');
const NUM = { 0: 'zero', 1: 'um', 2: 'dois', 3: 'tres', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez' };
const words = t => norm(t).split(' ').map(w => NUM[w] || w).join(' ');
async function heard(pcm) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CHECK}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Transcreva exatamente o que é falado neste áudio, em português. Responda só a transcrição.' }, { inlineData: { mimeType: 'audio/wav', data: wav(pcm).toString('base64') } }] }] })
    });
    if (r.ok) return (await r.json()).candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    await sleep(5000 * (i + 1));
  }
  return null; // não deu para conferir: aceita
}

for (const voice of arg('vozes', 'Charon,Leda').split(',')) {
  const id = voice.toLowerCase(), dir = `data/voz/${id}`, progress = `${dir}/.live.json`;
  await mkdir(dir, { recursive: true });
  const done = await exists(progress) ? JSON.parse(await readFile(progress, 'utf8')) : {};
  const items = catalog();
  const ready = async c => done[c] && await exists(`${dir}/${done[c]}`) && (await readFile(`${dir}/${done[c]}`)).length > 2048;
  // Primeiro as palavras soltas que faltam, em listas de 6
  const singles = [];
  for (const x of items) if (!/\s/.test(x.text.trim()) && !await ready(x.id)) singles.push(x);
  for (let b = 0; b < singles.length; b += 6) {
    const group = singles.slice(b, b + 6), list = group.map(x => x.text.replace(/[.!?:]$/, ''));
    for (let t = 0; t < 4; t++) {
      try {
        const pcm = await live(list.join(', '), voice, `Leia esta lista em voz alta, uma palavra por vez, com uma pausa de um segundo entre elas, sem dizer mais nada: ${list.join('... ')}.`);
        const parts = split(pcm, group.length);
        if (!parts || parts.some(x => x.length < RATE * 2 * 0.2)) { console.log(`  ${voice} lista ${list.join(', ')}: não separou, refazendo`); continue; }
        const got = await heard(pcm);
        if (got !== null && words(got) !== words(list.join(' '))) { console.log(`  ${voice} lista: ouviu "${got.trim()}", refazendo`); continue; }
        for (const [k, x] of group.entries()) done[x.id] = x.id + await save(parts[k], `${dir}/${x.id}`);
        await writeFile(progress, JSON.stringify(done));
        console.log(`${voice} lista ok: ${list.join(', ')}`);
        break;
      } catch (e) { console.log(`  ${voice} lista: ${e.message}, tentando de novo`); await sleep(3000); }
    }
  }
  for (const [i, { id: clip, text }] of items.entries()) {
    if (await ready(clip)) continue; // refaz áudio vazio
    let ok = false;
    for (let t = 0; t < 8 && !ok; t++) {
      try {
        const pcm = trim(await live(text, voice));
        if (pcm.length < RATE * 2 * 0.25) throw new Error('veio sem fala'); // a Live às vezes não fala palavras soltas
        const got = await heard(pcm);
        ok = got === null || words(got) === words(text);
        if (!ok && t < 3) { console.log(`  ${voice} ${i + 1}: ouviu "${got.trim()}", refazendo`); continue; }
        done[clip] = clip + await save(pcm, `${dir}/${clip}`);
        await writeFile(progress, JSON.stringify(done));
        console.log(`${voice} ${i + 1}/${items.length} ${text}${ok ? '' : '  (aceita após 4 tentativas, confira)'}`);
        ok = true;
      } catch (e) { console.log(`  ${voice} ${i + 1}: ${e.message}, tentando de novo`); await sleep(3000); }
    }
    if (!ok) throw new Error(`não consegui gerar "${text}". Rode de novo: continua daqui.`);
  }
  await writeFile(`${dir}/manifest.json`, JSON.stringify({ voice, model: MODEL, version: new Date().toISOString().slice(0, 16) + '-live-' + items.length, files: Object.fromEntries(items.map(x => [x.id, done[x.id]])) }, null, 1));
  const f = 'data/voz/index.json', idx = await exists(f) ? JSON.parse(await readFile(f, 'utf8')) : { voices: [] };
  if (!idx.voices.some(v => v.id === id)) idx.voices.push({ id, name: LABEL[voice] || voice });
  await writeFile(f, JSON.stringify(idx, null, 1));
  console.log(`Pronto: ${voice} com ${items.length} falas em ${dir}`);
}
console.log('Agora: git add data/voz && git commit -m "Vozes do treinador geradas pela Gemini Live" && git push');
