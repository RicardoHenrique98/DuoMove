// Gera o pacote de vozes naturais do treinador com o Gemini (texto → fala) e salva em data/voz/<voz>/.
// Uso (nesta nuvem, com NODE_USE_ENV_PROXY=1): node tools/gerar-vozes.mjs --voz Charon [--nome "Charon"] [--lote 25] [--modelo …] [--amostra]
// A chave vem de GEMINI_API_KEY ou, num ambiente com "segredo de rede", é anexada pelo próprio ambiente.
// O plano gratuito permite poucos pedidos por dia: cada pedido lê um lote de frases separadas por
// pausas, e o áudio é cortado nas pausas. Se o número de cortes não bater, o lote é refeito.
// --amostra gera só a frase de apresentação de várias vozes, para escolher qual usar.
// É retomável: lotes já gerados são pulados. Precisa do ffmpeg instalado.
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { catalog } from '../js/voicecatalog.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const KEY = process.env.GEMINI_API_KEY;
// O 3.8 lê a instrução de estilo em voz alta; o 2.5 obedece
const MODEL = arg('modelo', process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts');
const SAMPLE = process.argv.includes('--amostra');
const BATCH = +arg('lote', 25); // lotes maiores passam de 1 minuto e o proxy corta (502)
if (!KEY) console.log('GEMINI_API_KEY não definida: usando o segredo de rede do ambiente, se houver.');

const LEAD = 'Leia, como um personal trainer brasileiro animado e claro, cada linha abaixo, fazendo uma pausa de dois segundos entre uma linha e outra:\n\n';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const exists = f => access(f).then(() => true, () => false);

async function tts(lines, voice) {
  for (let tries = 0; tries < 4; tries++) { // cada tentativa gasta a cota diária
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(KEY ? { 'x-goog-api-key': KEY } : {}) },
      body: JSON.stringify({
        contents: [{ parts: [{ text: LEAD + lines.map(t => /[.!?:]$/.test(t) ? t : t + '.').join('\n') }] }], // lista de números soltos sem ponto é recusada
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } }
      })
    });
    if (r.status === 429 || r.status >= 500) {
      const body = await r.text();
      if (/per day/i.test(body)) throw new Error('Limite diário do plano gratuito atingido. Rode de novo amanhã: continua de onde parou.');
      const wait = (+(body.match(/"retryDelay":\s*"(\d+)s"/) || [])[1] || 20) * 1000;
      console.log(`  ${r.status}: aguardando ${wait / 1000}s…`); await sleep(wait); continue;
    }
    const j = await r.json();
    if (!r.ok) throw new Error(`${r.status}: ${j.error?.message}`);
    const data = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (!data) throw new Error('resposta sem áudio: ' + JSON.stringify(j).slice(0, 300));
    return Buffer.from(data, 'base64'); // PCM 16 bits, 24 kHz, mono
  }
  throw new Error('muitas tentativas');
}

// Pontos de corte (em amostras) no meio de cada pausa longa
function cuts(pcm) {
  const r = spawnSync('ffmpeg', ['-f', 's16le', '-ar', '24000', '-ac', '1', '-i', 'pipe:0', '-af', 'silencedetect=n=-40dB:d=0.6', '-f', 'null', '-'], { input: pcm });
  const s = String(r.stderr), starts = [...s.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]), ends = [...s.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
  return ends.map((e, i) => Math.round((starts[i] + e) / 2 * 24000) * 2).filter(c => c > 4800 && c < pcm.length - 4800);
}

// PCM → AAC (m4a) leve, cortando o silêncio do começo e do fim
function encode(pcm, out) {
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', 'pipe:0',
    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse',
    '-c:a', 'aac', '-b:a', '48k', out], { input: pcm });
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
}

async function updateIndex(voice, label) {
  const f = 'data/voz/index.json';
  const idx = await exists(f) ? JSON.parse(await readFile(f, 'utf8')) : { voices: [] };
  if (!idx.voices.some(v => v.id === voice.toLowerCase())) idx.voices.push({ id: voice.toLowerCase(), name: label || voice });
  await writeFile(f, JSON.stringify(idx, null, 1));
}

if (SAMPLE) {
  const voices = (arg('vozes', 'Kore,Puck,Charon,Aoede,Fenrir,Leda,Orus,Zephyr')).split(',');
  await mkdir('data/voz/amostras', { recursive: true });
  for (const v of voices) {
    const out = `data/voz/amostras/${v.toLowerCase()}.m4a`;
    if (await exists(out)) continue;
    console.log('amostra', v);
    encode(await tts(['Oi! Eu sou o seu treinador no Duo Move. Boa! Descanse 1 minuto e meio. Vai! Corra 1 minuto em ritmo leve.'], v), out);
  }
  console.log('Amostras em data/voz/amostras/');
} else {
  const voice = arg('voz', 'Kore'), id = voice.toLowerCase(), dir = `data/voz/${id}`;
  await mkdir(dir, { recursive: true });
  const items = catalog(), files = Object.fromEntries(items.map(i => [i.id, i.id + '.m4a']));
  for (let b = 0; b < items.length; b += BATCH) {
    const lote = items.slice(b, b + BATCH);
    if ((await Promise.all(lote.map(i => exists(`${dir}/${files[i.id]}`)))).every(Boolean)) continue;
    for (let tries = 0; ; tries++) {
      console.log(`lote ${b + 1}–${b + lote.length} de ${items.length}${tries ? ` (tentativa ${tries + 1})` : ''}`);
      const pcm = await tts(lote.map(i => i.text), voice), c = cuts(pcm);
      if (c.length === lote.length - 1) {
        [0, ...c].forEach((start, k) => encode(pcm.subarray(start, c[k] ?? pcm.length), `${dir}/${files[lote[k].id]}`));
        break;
      }
      console.log(`  ${c.length + 1} trechos para ${lote.length} frases: refazendo`);
      if (tries >= 2) throw new Error('o lote não separou certo; tente com --lote menor');
    }
  }
  await writeFile(`${dir}/manifest.json`, JSON.stringify({ voice, model: MODEL, version: new Date().toISOString().slice(0, 10) + '-' + items.length, files }, null, 1));
  await updateIndex(voice, arg('nome', voice));
  console.log(`Pronto: ${items.length} áudios em ${dir}`);
}
