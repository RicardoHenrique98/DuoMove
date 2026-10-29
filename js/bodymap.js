// Mapa do corpo (frente e costas) com os músculos do treino pintados; quanto mais séries, mais forte a cor
import { getEx } from './store.js';
import { MUSCLES } from './data.js';
import { countsForStats } from './stats.js';
import { esc } from './util.js';

// [músculo (null = só silhueta), forma do lado esquerdo, espelhar para o lado direito]. viewBox 100×178 por vista
const HEAD = [null, '<ellipse cx="50" cy="12" rx="8.5" ry="10.5"/>'];
const ARMS = [['antebraco', '<path d="M24 64q-3 9-1.5 19h5Q31 73 31 64q-3-2-7 0z"/>', 1], [null, '<ellipse cx="24.5" cy="88" rx="3" ry="4.5"/>', 1]];
const SHIN = [[null, '<ellipse cx="41" cy="131.5" rx="4.5" ry="3.5"/>', 1], [null, '<path d="M38 169h6l1 6h-9z"/>', 1]];
const FRONT = [HEAD,
  ['pescoco', '<path d="M45 22h10v9H45z"/>'],
  ['trapezio', '<path d="M45 27 35 32.5 45 33z"/>', 1],
  ['ombros', '<ellipse cx="30.5" cy="38.5" rx="6.8" ry="6.5"/>', 1],
  ['peito', '<path d="M49.3 34H39q-4 3-3 11 6 5 13.3 3z"/>', 1],
  ['biceps', '<ellipse cx="28.5" cy="53.5" rx="4.6" ry="9"/>', 1],
  ...ARMS,
  ['abdomen', '<rect x="42.5" y="50.5" width="15" height="28" rx="4"/>'],
  ['abdomen', '<path d="M41 51h-4.5Q35 66 39 79h2.5z"/>', 1],
  [null, '<path d="M37 80.5h26l3 11H34z"/>'],
  ['quadriceps', '<path d="M34.5 93q-2.5 17 1.5 34 5 3 9.5 0 3-16 1-34z"/>', 1],
  ['adutores', '<path d="M47.5 93h2v20l-2.5 3q1.5-11 .5-23z"/>', 1],
  ['panturrilha', '<path d="M36.5 137q-2 14 2 30h4.5q3-16 1.5-30-4-2-8 0z"/>', 1],
  ...SHIN];
const BACK = [HEAD,
  ['pescoco', '<path d="M45.5 22h9v6h-9z"/>'],
  ['costas', '<path d="M43.5 37.5 37.5 40q-2 15 4.5 28l7.5 2.5V55z"/>', 1],
  ['trapezio', '<path d="M50 25 36 33l7 3 7 16 7-16 7-3z"/>'],
  ['ombros', '<ellipse cx="30.5" cy="38.5" rx="6.8" ry="6.5"/>', 1],
  ['triceps', '<ellipse cx="28.5" cy="53.5" rx="4.6" ry="9"/>', 1],
  ...ARMS,
  ['lombar', '<rect x="43" y="70" width="14" height="10" rx="3"/>'],
  ['gluteos', '<ellipse cx="42.5" cy="89" rx="7.5" ry="8.5"/>', 1],
  ['posterior', '<path d="M35 99q-2.5 14 1 28 5 3 9.5 0 3-14 1.5-28-6-3-11.5 0z"/>', 1],
  ['panturrilha', '<path d="M36 137q-3 10 0 20 2 9 4 10h3q3-12 2-30-5-3-9 0z"/>', 1],
  ...SHIN];

// Exercícios de corpo inteiro e cardio pintam vários grupos, com metade do peso
const ALL = ['peito', 'costas', 'ombros', 'biceps', 'triceps', 'antebraco', 'quadriceps', 'posterior', 'gluteos', 'adutores', 'panturrilha', 'abdomen', 'trapezio', 'lombar'];
const SPREAD = { corpo: ALL, cardio: ['quadriceps', 'posterior', 'gluteos', 'panturrilha'] };

export function muscleSets(exercises) {
  const m = {};
  for (const e of exercises) {
    const k = getEx(e.exId).muscle, n = e.sets.filter(countsForStats).length;
    if (SPREAD[k]) for (const x of SPREAD[k]) m[x] = (m[x] || 0) + n / 2;
    else if (MUSCLES[k]) m[k] = (m[k] || 0) + n;
  }
  return m;
}

function view(parts, m, max, dx) {
  const paint = k => k && m[k] ? `class="bm-on" style="fill-opacity:${(0.35 + 0.65 * m[k] / max).toFixed(2)}"` : `class="${k ? 'bm-off' : 'bm-skin'}"`;
  return `<g transform="translate(${dx} 0)">${parts.map(([k, shape, mirror]) =>
    `<g ${paint(k)}>${shape}</g>` + (mirror ? `<g transform="matrix(-1 0 0 1 100 0)" ${paint(k)}>${shape}</g>` : '')).join('')}</g>`;
}

export function bodyMap(exercises) {
  const m = muscleSets(exercises), names = Object.keys(m).filter(k => m[k] > 0).sort((a, b) => m[b] - m[a]);
  if (!names.length) return '';
  const max = m[names[0]], label = names.map(k => MUSCLES[k]).join(' · ');
  return `<div class="card bodymap"><svg viewBox="0 0 210 178" role="img" aria-label="Músculos trabalhados: ${esc(label)}">
    ${view(FRONT, m, max, 0)}${view(BACK, m, max, 110)}</svg><p class="muted small center">${esc(label)}</p></div>`;
}
