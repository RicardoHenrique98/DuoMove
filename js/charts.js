import { esc, fmtNum } from './util.js';

const W = 340, H = 150, PAD = { l: 34, r: 8, t: 12, b: 22 };

const niceMax = v => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

function axis(max, fmt) {
  const ih = H - PAD.t - PAD.b;
  return [0, 0.5, 1].map(f => {
    const y = PAD.t + ih * (1 - f);
    return `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y}" y2="${y}" class="grid"/><text x="${PAD.l - 6}" y="${y + 3}" text-anchor="end" class="tick">${esc(fmt(max * f))}</text>`;
  }).join('');
}

// points: [{label, value}]
export function barChart(points, fmt = v => fmtNum(v, 0), label = 'Gráfico') {
  const max = niceMax(Math.max(...points.map(p => p.value), 0));
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b, step = iw / points.length, bw = Math.min(22, step * 0.62);
  const bars = points.map((p, i) => {
    const h = (p.value / max) * ih, x = PAD.l + step * i + (step - bw) / 2, y = PAD.t + ih - h;
    const showLabel = points.length <= 8 || i % 2 === (points.length - 1) % 2;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h, p.value ? 2 : 0)}" rx="4" class="${i === points.length - 1 ? 'bar now' : 'bar'}"><title>${esc(p.label)}: ${esc(fmt(p.value))}</title></rect>`
      + (showLabel ? `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" class="tick">${esc(p.label)}</text>` : '');
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${axis(max, fmt)}${bars}</svg>`;
}

export function lineChart(points, fmt = v => fmtNum(v, 1), label = 'Gráfico') {
  if (points.length < 2) return `<div class="empty small">Faça pelo menos 2 sessões para ver o gráfico.</div>`;
  const vals = points.map(p => p.value), max = niceMax(Math.max(...vals)), min = 0;
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const xy = points.map((p, i) => [PAD.l + (iw * i) / (points.length - 1), PAD.t + ih * (1 - (p.value - min) / (max - min || 1))]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${d} L${xy.at(-1)[0]} ${PAD.t + ih} L${xy[0][0]} ${PAD.t + ih}Z`;
  const ticks = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${axis(max, fmt)}
    <path d="${area}" class="area"/><path d="${d}" class="line"/>
    ${xy.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === xy.length - 1 ? 4 : 2.5}" class="dot"><title>${esc(points[i].label)}: ${esc(fmt(points[i].value))}</title></circle>`).join('')}
    ${ticks.map(i => `<text x="${xy[i][0]}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}" class="tick">${esc(points[i].label)}</text>`).join('')}
  </svg>`;
}
