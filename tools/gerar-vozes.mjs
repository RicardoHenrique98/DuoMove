// Gera o pacote de vozes naturais do treinador com o Gemini (texto → fala) e salva em data/voz/<voz>/.
// Uso (nesta nuvem, com NODE_USE_ENV_PROXY=1): node tools/gerar-vozes.mjs --voz Kore [--modelo gemini-3.8-flash-tts] [--amostra]
// A chave vem de GEMINI_API_KEY ou, num ambiente com "segredo de rede", é anexada pelo próprio ambiente.
// --amostra gera só a frase de apresentação de várias vozes, para escolher qual usar.
// É retomável: áudios já gerados são pulados. Precisa do ffmpeg instalado.
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { catalog } from '../js/voicecatalog.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const KEY = process.env.GEMINI_API_KEY;
const MODEL = arg('modelo', process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts');
const SAMPLE = process.argv.includes('--amostra');
if (!KEY) console.log('GEMINI_API_KEY não definida: usando o segredo de rede do ambiente, se houver.');

const STYLE = 'Fale em português do Brasil, com sotaque brasileiro, como um personal trainer animado, claro e encorajador. Leia só o texto entre aspas, sem acrescentar nada, sem pausa no começo nem no fim: ';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const exists = f => access(f).then(() => true, () => false);

async function tts(text, voice) {
  for (let tries = 0; tries < 8; tries++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(KEY ? { 'x-goog-api-key': KEY } : {}) },
      body: JSON.stringify({
        contents: [{ parts: [{ text: STYLE + '"' + text + '"' }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } }
      })
    });
    if (r.status === 429 || r.status >= 500) {
      const body = await r.text();
      const wait = (+(body.match(/"retryDelay":\s*"(\d+)s"/) || [])[1] || 20) * 1000;
      console.log(`  aguardando ${wait / 1000}s (limite da API)…`); await sleep(wait); continue;
    }
    const j = await r.json();
    if (!r.ok) throw new Error(`${r.status}: ${j.error?.message}`);
    const data = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (!data) throw new Error('resposta sem áudio');
    return Buffer.from(data, 'base64'); // PCM 16 bits, 24 kHz, mono
  }
  throw new Error('muitas tentativas');
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
    encode(await tts('Oi! Eu sou o seu treinador no Duo Move. Boa! Descanse 1 minuto e meio. Vai! Corra 1 minuto em ritmo leve.', v), out);
  }
  console.log('Amostras em data/voz/amostras/');
} else {
  const voice = arg('voz', 'Kore'), id = voice.toLowerCase(), dir = `data/voz/${id}`;
  await mkdir(dir, { recursive: true });
  const files = {}, items = catalog();
  for (const [i, { id: clip, text }] of items.entries()) {
    const file = clip + '.m4a', out = `${dir}/${file}`;
    files[clip] = file;
    if (await exists(out)) continue;
    console.log(`${i + 1}/${items.length} ${text}`);
    encode(await tts(text, voice), out);
  }
  await writeFile(`${dir}/manifest.json`, JSON.stringify({ voice, model: MODEL, version: new Date().toISOString().slice(0, 10) + '-' + items.length, files }, null, 1));
  await updateIndex(voice, arg('nome', voice));
  console.log(`Pronto: ${items.length} áudios em ${dir}`);
}
