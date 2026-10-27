import { state } from './store.js';

// Tema: escuro por padrão; claro (creme Duo) ou automático pelo perfil
export function applyTheme() {
  const t = state.profile.theme || 'dark';
  document.documentElement.dataset.theme = t;
  const light = t === 'light' || (t === 'auto' && matchMedia('(prefers-color-scheme: light)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#FDF8F3' : '#101211');
}
