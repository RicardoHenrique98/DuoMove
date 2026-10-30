// Catálogo das falas do treinador para o pacote de vozes naturais (gerado uma vez e baixado pelo app).
// As frases fixas, os números e os nomes dos exercícios viram áudios curtos; o app monta a fala
// juntando os pedaços. Usado no app e no gerador (tools/gerar-vozes.mjs), por isso não toca no DOM.
import { EXERCISES } from './data.js';

// Pedaços fixos, exatamente como aparecem nas falas
export const PHRASES = [
  'Oi! Eu sou o seu treinador no Duo Move.',
  'Boa!', 'Descanse', 'Faltam 10 segundos.', 'Prepare-se:', 'Próximo:', 'Metade. Mantenha o ritmo.',
  'Sem descanso. Agora:', 'Vai!', 'Cronômetro rodando.', 'Tempo!', 'Descanso terminado.',
  'Bora para a próxima série!', 'Treino concluído! Parabéns. Toque em finalizar para salvar.', 'Intervalo concluído.',
  'Era a última série. Toque em finalizar quando terminar.', 'Treino completo. Toque em finalizar.',
  'Muito bem!', 'Agora caminhe', 'Agora gire leve por', 'Recupere bem leve por', 'Aquecimento.', 'Desaquecimento.',
  'Corra', 'Corra na esteira', 'Caminhe', 'Pedale', 'Siga no elíptico', 'Reme', 'Suba no simulador', 'Vai',
  'de novo.',
  'em ritmo leve.', 'em ritmo forte.', 'em ritmo de conversa.', 'Intervalo',
  'série', 'aquecimento', 'até a falha', 'drop set', 'rest-pause', 'cluster',
  'repetições', 'com', 'quilos', 'de', 'a', 'e', 'e meio', 'minuto', 'minutos', 'segundos'
];

const UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const TENS = { 20: 'vinte', 30: 'trinta', 40: 'quarenta', 50: 'cinquenta', 60: 'sessenta', 70: 'setenta', 80: 'oitenta', 90: 'noventa' };
const HUNDREDS = { 100: 'cento', 200: 'duzentos', 300: 'trezentos', 400: 'quatrocentos', 500: 'quinhentos', 600: 'seiscentos', 700: 'setecentos', 800: 'oitocentos', 900: 'novecentos' };

export const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = s => norm(s).replace(/[^a-z0-9-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Nome falado do exercício (sem o que está entre parênteses), igual ao usado pelo treinador
export const spokenName = name => name.replace(/\s*\(.*?\)\s*/g, ' ').trim();

// Todos os áudios do pacote: [{ id, text }]
export function catalog() {
  const out = new Map();
  PHRASES.forEach(t => out.set('f-' + slug(t), t));
  UNITS.forEach((t, n) => out.set('n-' + n, t));
  Object.entries(TENS).forEach(([n, t]) => out.set('n-' + n, t));
  Object.entries(HUNDREDS).forEach(([n, t]) => out.set('n-' + n, t));
  out.set('n-cem', 'cem'); out.set('n-f1', 'uma'); out.set('n-f2', 'duas');
  for (const e of EXERCISES) { const t = spokenName(e.name); out.set('x-' + slug(t), t); }
  return [...out].map(([id, text]) => ({ id, text }));
}

// "42" -> ["n-40","f-e","n-2"]; feminino para "uma/duas repetições"
export function numberParts(n, fem = false) {
  if (!Number.isInteger(n) || n < 0 || n > 999) return null;
  if (fem && n === 1) return ['n-f1'];
  if (fem && n === 2) return ['n-f2'];
  if (n < 20) return ['n-' + n];
  if (n < 100) { const t = n - (n % 10); return n % 10 ? ['n-' + t, 'f-e', ...numberParts(n % 10, fem)] : ['n-' + t]; }
  if (n === 100) return ['n-cem'];
  const h = n - (n % 100), rest = n % 100;
  return rest ? ['n-' + h, 'f-e', ...numberParts(rest, fem)] : ['n-' + (h === 100 ? 'cem' : h)];
}

// Índice: sequência de palavras -> id do áudio (para casar a frase pelo trecho mais longo)
let INDEX = null;
function index() {
  if (INDEX) return INDEX;
  INDEX = new Map();
  for (const { id, text } of catalog()) if (!id.startsWith('n-')) INDEX.set(words(text).join(' '), id);
  return INDEX;
}
const MAX_WORDS = 10;

/**
 * Converte a frase do treinador na sequência de áudios. Devolve [{ id, pause }] ou null quando
 * algum trecho não existe no pacote (aí o app usa a voz do aparelho para a frase inteira).
 */
export function toClips(text) {
  const raw = String(text).split(/\s+/).filter(Boolean);
  const toks = raw.map(r => ({ w: words(r).join(' '), pause: /[.!?:,]$/.test(r) })).filter(t => t.w);
  const idx = index(), out = [];
  for (let i = 0; i < toks.length;) {
    let hit = null;
    for (let n = Math.min(MAX_WORDS, toks.length - i); n > 0 && !hit; n--) {
      const key = toks.slice(i, i + n).map(t => t.w).join(' ');
      if (idx.has(key)) hit = { id: idx.get(key), n };
    }
    if (hit) { out.push({ id: hit.id, pause: toks[i + hit.n - 1].pause }); i += hit.n; continue; }
    if (/^\d+$/.test(toks[i].w)) {
      const next = toks[i + 1]?.w || '';
      const parts = numberParts(+toks[i].w, /^(repeticoes|series)$/.test(next));
      if (!parts) return null;
      parts.forEach((id, k) => out.push({ id, pause: k === parts.length - 1 && toks[i].pause }));
      i++; continue;
    }
    return null;
  }
  return out;
}
