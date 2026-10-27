// Técnicas avançadas. Funcionam tanto nas séries do treino em andamento (alvo em s.t)
// quanto nas séries de uma rotina (alvo na própria série), via o adaptador `io`.

export const SET_TYPES = {
  n: { tag: null, label: 'Normal' },
  w: { tag: 'A', label: 'Aquecimento' },
  f: { tag: 'F', label: 'Até a falha' },
  d: { tag: 'D', label: 'Drop set' },
  r: { tag: 'RP', label: 'Rest-pause' },
  c: { tag: 'C', label: 'Cluster' }
};

// Descanso automático antes de uma série desse tipo (null = descanso normal do exercício)
export const INTRA_REST = { d: 0, r: 15, c: 20 };

export const TECHNIQUES = {
  drop: { label: 'Drop set', desc: 'Na última série, ao falhar, reduza ~20% da carga e continue sem descanso. Repita 2 vezes.' },
  restpause: { label: 'Rest-pause', desc: 'Depois da última série, descanse 15 s e faça mais repetições com a mesma carga. Repita 2 vezes.' },
  cluster: { label: 'Cluster', desc: 'Divide a série em blocos curtos (ex.: 4 × 3) com 20 s de pausa. Permite carga mais alta com boa técnica.' },
  pyrUp: { label: 'Pirâmide crescente', desc: 'A cada série sobe a carga e diminui as repetições (12 → 10 → 8 → 6).' },
  pyrDown: { label: 'Pirâmide decrescente', desc: 'Começa pesado e vai tirando carga para fazer mais repetições (6 → 8 → 10 → 12).' },
  failure: { label: 'Última série até a falha', desc: 'Leve a última série até não conseguir mais nenhuma repetição com boa técnica.' },
  superset: { label: 'Bi-set com o próximo', desc: 'Faz este exercício e o próximo em sequência, sem descanso entre eles. Descansa só no fim da rodada.' }
};

export const GROUP_NAMES = ['', '', 'Bi-set', 'Tri-set'];
export const groupName = n => GROUP_NAMES[n] || 'Circuito';

export const isMain = s => !s.type || s.type === 'n' || s.type === 'f';
const round = kg => kg == null ? null : Math.max(0, Math.round(kg / 0.5) * 0.5);

/**
 * Aplica a técnica `key` às séries.
 * io = { tgt: s => objeto-alvo, make: (alvo, tipo) => nova série, locked: s => bool, baseKg: (s, i) => kg }
 */
export function applyTechnique(key, sets, io) {
  const main = sets.filter(isMain);
  const last = main.at(-1);
  // Remove técnicas anteriores que ainda não foram feitas
  sets = sets.filter(s => io.locked(s) || !['d', 'r', 'c'].includes(s.type));
  if (key === 'clear') { sets.forEach(s => { if (!io.locked(s) && s.type === 'f') s.type = 'n'; }); return sets; }
  if (!last) return sets;
  const kgLast = io.baseKg(last, main.length - 1);
  const repsLast = io.tgt(last).reps || 10;
  const at = sets.indexOf(last) + 1;
  const insert = arr => { sets.splice(at, 0, ...arr); return sets; };

  if (key === 'drop') return insert([0.8, 0.64].map(f => io.make({ kg: kgLast ? round(kgLast * f) : null, reps: Math.max(6, Math.round(repsLast * 0.8)) }, 'd')));
  if (key === 'restpause') return insert([1, 2].map(() => io.make({ kg: kgLast, reps: Math.max(2, Math.round(repsLast / 3)) }, 'r')));
  if (key === 'cluster') {
    if (!io.locked(last)) { io.tgt(last).reps = 3; delete io.tgt(last).rmax; }
    return insert([1, 2, 3].map(() => io.make({ kg: kgLast, reps: 3 }, 'c')));
  }
  if (key === 'failure') { if (!io.locked(last)) last.type = 'f'; return sets; }
  if (key === 'pyrUp' || key === 'pyrDown') {
    const open = sets.filter(s => isMain(s) && !io.locked(s));
    while (open.length < 4) { const s = io.make({}, 'n'); sets.splice(sets.indexOf(open.at(-1) || last) + 1, 0, s); open.push(s); }
    const reps = key === 'pyrUp' ? [12, 10, 8, 6] : [6, 8, 10, 12];
    // Proporção sobre a carga de trabalho (a que você faria ~10 repetições)
    const factor = key === 'pyrUp' ? [0.9, 1, 1.07, 1.15] : [1.15, 1.07, 1, 0.9];
    const top = Math.max(...main.map((s, i) => io.baseKg(s, i) || 0)) || null;
    open.slice(0, 4).forEach((s, i) => {
      const t = io.tgt(s);
      t.reps = reps[i]; delete t.rmax;
      t.kg = top ? round(top * factor[i]) : t.kg;
      s.type = 'n';
    });
    return sets;
  }
  return sets;
}

// Descanso depois de concluir `set`, considerando técnicas e bi-sets
export function restAfter(exercises, ex, set, defaultRest) {
  const next = ex.sets[ex.sets.indexOf(set) + 1];
  if (next && !next.done && next.type in INTRA_REST) return { rest: INTRA_REST[next.type] };
  if (ex.group) {
    const group = exercises.filter(e => e.group === ex.group);
    const pos = group.indexOf(ex);
    if (pos < group.length - 1) return { rest: 0, next: group[pos + 1] };
  }
  return { rest: defaultRest };
}
