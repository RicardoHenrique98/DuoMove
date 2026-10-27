export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Aceita vírgula ou ponto como separador decimal
export const num = v => {
  if (v === '' || v == null) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export const fmtNum = (n, d = 1) => n == null || n === '' ? '' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d });

export const fmtKg = n => n >= 1000 ? `${fmtNum(n / 1000, 1)} t` : `${fmtNum(n, 0)} kg`;

export const fmtDuration = ms => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
};

export const fmtClock = ms => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const fmtRest = sec => {
  if (!sec) return 'Desligado';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}min${s ? ' ' + s + 's' : ''}` : `${s}s`;
};

export const fmtDate = (ts, opts = { day: '2-digit', month: 'short' }) => new Intl.DateTimeFormat('pt-BR', opts).format(new Date(ts));

export const fmtPace = (km, min) => {
  if (!km || !min) return '';
  const p = min / km, m = Math.floor(p), s = Math.round((p - m) * 60);
  return `${m}:${String(s === 60 ? 0 : s).padStart(2, '0')}/km`;
};

export const startOfWeek = ts => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // semana começa na segunda
  return d.getTime();
};

export const DAY = 864e5;

export const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
