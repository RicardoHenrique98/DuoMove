// Navegação por hash: #/rotinas, #/historico/abc ...
const routes = [];
let current = null;

export function route(pattern, view) { routes.push({ pattern, view }); }

export function go(path, { replace = false } = {}) {
  const target = '#' + path;
  if (location.hash === target) return rerender();
  replace ? location.replace(target) : (location.hash = target);
}

export const back = fallback => history.length > 1 ? history.back() : go(fallback);

export function resolve() {
  const path = location.hash.slice(1) || '/inicio';
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) return { view: r.view, params: m.slice(1).map(decodeURIComponent), path };
  }
  return { view: routes[0].view, params: [], path: '/inicio' };
}

let renderFn = () => {};
export const onRender = fn => { renderFn = fn; };
export function rerender({ keepScroll = true } = {}) { current = resolve(); renderFn(current, keepScroll); }
export const currentRoute = () => current;
