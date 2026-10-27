// Biblioteca de exercícios e rotinas prontas.
// type: 'peso' (kg × reps) · 'corpo' (só reps) · 'tempo' (segundos) · 'cardio' (km + minutos)

export const MUSCLES = {
  peito: 'Peito', costas: 'Costas', ombros: 'Ombros', biceps: 'Bíceps', triceps: 'Tríceps',
  antebraco: 'Antebraço', quadriceps: 'Quadríceps', posterior: 'Posterior de coxa', gluteos: 'Glúteos',
  adutores: 'Adutores', panturrilha: 'Panturrilha', abdomen: 'Abdômen', trapezio: 'Trapézio',
  corpo: 'Corpo inteiro', cardio: 'Cardio'
};

export const EQUIP = {
  barra: 'Barra', halter: 'Halteres', maquina: 'Máquina', polia: 'Polia', corporal: 'Peso corporal',
  elastico: 'Elástico', kettlebell: 'Kettlebell', anilha: 'Anilha', nenhum: 'Nenhum'
};

export const TYPES = { peso: 'Carga e repetições', corpo: 'Só repetições', tempo: 'Tempo', cardio: 'Distância e tempo' };

// Montagem rápida por grupo: exercícios em ordem de prioridade (composto primeiro, depois isolado)
export const GROUPS = {
  Peito: ['supino-reto-barra', 'supino-inclinado-halter', 'voador', 'crossover'],
  Costas: ['puxada-frontal', 'remada-curvada', 'remada-baixa', 'pulldown'],
  Ombros: ['desenvolvimento-halter', 'elevacao-lateral', 'crucifixo-inverso'],
  Bíceps: ['rosca-direta', 'rosca-martelo', 'rosca-inclinada'],
  Tríceps: ['triceps-corda', 'triceps-frances', 'triceps-testa'],
  Pernas: ['agachamento-livre', 'leg-press', 'stiff', 'cadeira-extensora', 'mesa-flexora'],
  Glúteos: ['elevacao-quadril', 'bulgaro', 'abdutora'],
  Panturrilha: ['panturrilha-pe', 'panturrilha-sentado'],
  Abdômen: ['prancha', 'elevacao-pernas', 'abdominal-polia'],
  Cardio: ['esteira', 'bike', 'eliptico']
};

const E = (id, name, muscle, equip, type = 'peso') => ({ id, name, muscle, equip, type });

export const EXERCISES = [
  // Peito
  E('supino-reto-barra', 'Supino reto (barra)', 'peito', 'barra'),
  E('supino-reto-halter', 'Supino reto (halteres)', 'peito', 'halter'),
  E('supino-inclinado-barra', 'Supino inclinado (barra)', 'peito', 'barra'),
  E('supino-inclinado-halter', 'Supino inclinado (halteres)', 'peito', 'halter'),
  E('supino-declinado', 'Supino declinado (barra)', 'peito', 'barra'),
  E('supino-smith', 'Supino no Smith', 'peito', 'maquina'),
  E('chest-press', 'Chest press (máquina)', 'peito', 'maquina'),
  E('crucifixo-halter', 'Crucifixo (halteres)', 'peito', 'halter'),
  E('voador', 'Voador / peck deck', 'peito', 'maquina'),
  E('crossover', 'Crossover (polia)', 'peito', 'polia'),
  E('flexao', 'Flexão de braços', 'peito', 'corporal', 'corpo'),
  E('mergulho', 'Mergulho nas paralelas', 'peito', 'corporal', 'corpo'),
  // Costas
  E('puxada-frontal', 'Puxada frontal (polia)', 'costas', 'polia'),
  E('puxada-supinada', 'Puxada supinada (polia)', 'costas', 'polia'),
  E('puxada-triangulo', 'Puxada com triângulo', 'costas', 'polia'),
  E('barra-fixa', 'Barra fixa', 'costas', 'corporal', 'corpo'),
  E('barra-assistida', 'Barra fixa assistida (máquina)', 'costas', 'maquina'),
  E('remada-curvada', 'Remada curvada (barra)', 'costas', 'barra'),
  E('remada-unilateral', 'Remada unilateral (halter)', 'costas', 'halter'),
  E('remada-baixa', 'Remada baixa (polia)', 'costas', 'polia'),
  E('remada-cavalinho', 'Remada cavalinho', 'costas', 'barra'),
  E('remada-maquina', 'Remada (máquina)', 'costas', 'maquina'),
  E('pulldown', 'Pulldown braço reto (polia)', 'costas', 'polia'),
  E('pullover', 'Pullover (halter)', 'costas', 'halter'),
  E('levantamento-terra', 'Levantamento terra (barra)', 'costas', 'barra'),
  E('hiperextensao', 'Hiperextensão lombar', 'costas', 'corporal', 'corpo'),
  E('encolhimento', 'Encolhimento (halteres)', 'trapezio', 'halter'),
  // Ombros
  E('desenvolvimento-halter', 'Desenvolvimento (halteres)', 'ombros', 'halter'),
  E('desenvolvimento-barra', 'Desenvolvimento militar (barra)', 'ombros', 'barra'),
  E('desenvolvimento-maquina', 'Desenvolvimento (máquina)', 'ombros', 'maquina'),
  E('arnold', 'Desenvolvimento Arnold', 'ombros', 'halter'),
  E('elevacao-lateral', 'Elevação lateral (halteres)', 'ombros', 'halter'),
  E('elevacao-lateral-polia', 'Elevação lateral (polia)', 'ombros', 'polia'),
  E('elevacao-frontal', 'Elevação frontal (halteres)', 'ombros', 'halter'),
  E('crucifixo-inverso', 'Crucifixo inverso (halteres)', 'ombros', 'halter'),
  E('voador-inverso', 'Voador inverso (máquina)', 'ombros', 'maquina'),
  E('face-pull', 'Face pull (polia)', 'ombros', 'polia'),
  // Bíceps
  E('rosca-direta', 'Rosca direta (barra)', 'biceps', 'barra'),
  E('rosca-alternada', 'Rosca alternada (halteres)', 'biceps', 'halter'),
  E('rosca-martelo', 'Rosca martelo (halteres)', 'biceps', 'halter'),
  E('rosca-scott', 'Rosca Scott', 'biceps', 'maquina'),
  E('rosca-polia', 'Rosca na polia', 'biceps', 'polia'),
  E('rosca-concentrada', 'Rosca concentrada', 'biceps', 'halter'),
  E('rosca-inclinada', 'Rosca inclinada (halteres)', 'biceps', 'halter'),
  // Tríceps
  E('triceps-polia', 'Tríceps na polia (barra)', 'triceps', 'polia'),
  E('triceps-corda', 'Tríceps corda', 'triceps', 'polia'),
  E('triceps-testa', 'Tríceps testa', 'triceps', 'barra'),
  E('triceps-frances', 'Tríceps francês (halter)', 'triceps', 'halter'),
  E('triceps-coice', 'Tríceps coice (halter)', 'triceps', 'halter'),
  E('mergulho-banco', 'Mergulho no banco', 'triceps', 'corporal', 'corpo'),
  E('supino-fechado', 'Supino fechado (barra)', 'triceps', 'barra'),
  // Antebraço
  E('rosca-punho', 'Rosca de punho', 'antebraco', 'barra'),
  // Quadríceps
  E('agachamento-livre', 'Agachamento livre (barra)', 'quadriceps', 'barra'),
  E('agachamento-goblet', 'Agachamento goblet', 'quadriceps', 'halter'),
  E('agachamento-smith', 'Agachamento no Smith', 'quadriceps', 'maquina'),
  E('agachamento-corpo', 'Agachamento (peso corporal)', 'quadriceps', 'corporal', 'corpo'),
  E('hack', 'Agachamento hack', 'quadriceps', 'maquina'),
  E('leg-press', 'Leg press 45°', 'quadriceps', 'maquina'),
  E('cadeira-extensora', 'Cadeira extensora', 'quadriceps', 'maquina'),
  E('afundo', 'Afundo (halteres)', 'quadriceps', 'halter'),
  E('bulgaro', 'Agachamento búlgaro', 'quadriceps', 'halter'),
  E('passada', 'Passada / avanço', 'quadriceps', 'halter'),
  E('step-up', 'Subida no banco (step-up)', 'quadriceps', 'halter'),
  // Posterior
  E('stiff', 'Stiff (barra)', 'posterior', 'barra'),
  E('terra-romeno', 'Terra romeno (halteres)', 'posterior', 'halter'),
  E('mesa-flexora', 'Mesa flexora', 'posterior', 'maquina'),
  E('cadeira-flexora', 'Cadeira flexora', 'posterior', 'maquina'),
  E('good-morning', 'Good morning', 'posterior', 'barra'),
  // Glúteos
  E('elevacao-quadril', 'Elevação de quadril (barra)', 'gluteos', 'barra'),
  E('ponte-gluteo', 'Ponte de glúteo', 'gluteos', 'corporal', 'corpo'),
  E('coice-polia', 'Coice na polia', 'gluteos', 'polia'),
  E('abdutora', 'Cadeira abdutora', 'gluteos', 'maquina'),
  E('kettlebell-swing', 'Kettlebell swing', 'gluteos', 'kettlebell'),
  E('adutora', 'Cadeira adutora', 'adutores', 'maquina'),
  // Panturrilha
  E('panturrilha-pe', 'Panturrilha em pé', 'panturrilha', 'maquina'),
  E('panturrilha-sentado', 'Panturrilha sentado', 'panturrilha', 'maquina'),
  E('panturrilha-leg', 'Panturrilha no leg press', 'panturrilha', 'maquina'),
  // Abdômen
  E('prancha', 'Prancha', 'abdomen', 'corporal', 'tempo'),
  E('prancha-lateral', 'Prancha lateral', 'abdomen', 'corporal', 'tempo'),
  E('abdominal', 'Abdominal (crunch)', 'abdomen', 'corporal', 'corpo'),
  E('elevacao-pernas', 'Elevação de pernas', 'abdomen', 'corporal', 'corpo'),
  E('abdominal-polia', 'Abdominal na polia', 'abdomen', 'polia'),
  E('dead-bug', 'Dead bug', 'abdomen', 'corporal', 'corpo'),
  E('bird-dog', 'Bird dog', 'abdomen', 'corporal', 'corpo'),
  E('russian-twist', 'Russian twist', 'abdomen', 'corporal', 'corpo'),
  E('roda-abdominal', 'Roda abdominal', 'abdomen', 'corporal', 'corpo'),
  // Peso corporal (treino em casa)
  E('flexao-pike', 'Flexão pike (ombros)', 'ombros', 'corporal', 'corpo'),
  E('remada-invertida', 'Remada invertida (mesa ou barra baixa)', 'costas', 'corporal', 'corpo'),
  E('afundo-corpo', 'Afundo (peso corporal)', 'quadriceps', 'corporal', 'corpo'),
  E('panturrilha-corpo', 'Panturrilha em pé (degrau)', 'panturrilha', 'corporal', 'corpo'),
  E('panturrilha-halter', 'Panturrilha unilateral (halter)', 'panturrilha', 'halter'),
  E('superman', 'Superman', 'costas', 'corporal', 'corpo'),
  // Corpo inteiro / funcional
  E('burpee', 'Burpee', 'corpo', 'corporal', 'corpo'),
  E('polichinelo', 'Polichinelo', 'corpo', 'corporal', 'tempo'),
  E('pular-corda', 'Pular corda', 'corpo', 'nenhum', 'tempo'),
  // Cardio
  E('corrida', 'Corrida (rua)', 'cardio', 'nenhum', 'cardio'),
  E('esteira', 'Esteira', 'cardio', 'maquina', 'cardio'),
  E('caminhada', 'Caminhada', 'cardio', 'nenhum', 'cardio'),
  E('pedal', 'Pedal (rua)', 'cardio', 'nenhum', 'cardio'),
  E('bike', 'Bicicleta ergométrica', 'cardio', 'maquina', 'cardio'),
  E('eliptico', 'Elíptico', 'cardio', 'maquina', 'cardio'),
  E('remo', 'Remo ergômetro', 'cardio', 'maquina', 'cardio'),
  E('escada', 'Escada (simulador)', 'cardio', 'maquina', 'cardio'),
  E('natacao', 'Natação', 'cardio', 'nenhum', 'cardio')
];

// Imagens de demonstração (início e fim do movimento) da Free Exercise DB — domínio público
// https://github.com/yuhonas/free-exercise-db
const IMG_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/';
export const imgUrl = (img, n) => `${IMG_BASE}${img}/${n}.jpg`;

const IMG = {
  'supino-reto-barra': 'Barbell_Bench_Press_-_Medium_Grip', 'supino-reto-halter': 'Dumbbell_Bench_Press',
  'supino-inclinado-barra': 'Barbell_Incline_Bench_Press_-_Medium_Grip', 'supino-inclinado-halter': 'Incline_Dumbbell_Press',
  'supino-declinado': 'Decline_Barbell_Bench_Press', 'supino-smith': 'Smith_Machine_Bench_Press', 'chest-press': 'Leverage_Chest_Press',
  'crucifixo-halter': 'Dumbbell_Flyes', voador: 'Butterfly', crossover: 'Cable_Crossover', flexao: 'Pushups', mergulho: 'Dips_-_Chest_Version',
  'puxada-frontal': 'Wide-Grip_Lat_Pulldown', 'puxada-supinada': 'Underhand_Cable_Pulldowns', 'puxada-triangulo': 'V-Bar_Pulldown',
  'barra-fixa': 'Pullups', 'barra-assistida': 'Band_Assisted_Pull-Up', 'remada-curvada': 'Bent_Over_Barbell_Row',
  'remada-unilateral': 'One-Arm_Dumbbell_Row', 'remada-baixa': 'Seated_Cable_Rows', 'remada-cavalinho': 'T-Bar_Row_with_Handle',
  'remada-maquina': 'Leverage_Iso_Row', pulldown: 'Straight-Arm_Pulldown', pullover: 'Front_Raise_And_Pullover',
  'levantamento-terra': 'Barbell_Deadlift', hiperextensao: 'Hyperextensions_Back_Extensions', encolhimento: 'Dumbbell_Shrug',
  'desenvolvimento-halter': 'Dumbbell_Shoulder_Press', 'desenvolvimento-barra': 'Standing_Military_Press',
  'desenvolvimento-maquina': 'Machine_Shoulder_Military_Press', arnold: 'Arnold_Dumbbell_Press', 'elevacao-lateral': 'Side_Lateral_Raise',
  'elevacao-lateral-polia': 'Cable_Seated_Lateral_Raise', 'elevacao-frontal': 'Front_Dumbbell_Raise',
  'crucifixo-inverso': 'Seated_Bent-Over_Rear_Delt_Raise', 'voador-inverso': 'Reverse_Machine_Flyes', 'face-pull': 'Face_Pull',
  'rosca-direta': 'Barbell_Curl', 'rosca-alternada': 'Dumbbell_Alternate_Bicep_Curl', 'rosca-martelo': 'Hammer_Curls',
  'rosca-scott': 'Preacher_Curl', 'rosca-polia': 'Standing_Biceps_Cable_Curl', 'rosca-concentrada': 'Concentration_Curls',
  'rosca-inclinada': 'Incline_Dumbbell_Curl', 'triceps-polia': 'Triceps_Pushdown', 'triceps-corda': 'Triceps_Pushdown_-_Rope_Attachment',
  'triceps-testa': 'EZ-Bar_Skullcrusher', 'triceps-frances': 'Standing_Dumbbell_Triceps_Extension', 'triceps-coice': 'Tricep_Dumbbell_Kickback',
  'mergulho-banco': 'Bench_Dips', 'supino-fechado': 'Close-Grip_Barbell_Bench_Press', 'rosca-punho': 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench',
  'agachamento-livre': 'Barbell_Squat', 'agachamento-goblet': 'Goblet_Squat', 'agachamento-smith': 'Smith_Machine_Squat',
  'agachamento-corpo': 'Bodyweight_Squat', hack: 'Hack_Squat', 'leg-press': 'Leg_Press', 'cadeira-extensora': 'Leg_Extensions',
  afundo: 'Dumbbell_Lunges', bulgaro: 'Split_Squat_with_Dumbbells', passada: 'Bodyweight_Walking_Lunge', 'step-up': 'Dumbbell_Step_Ups',
  stiff: 'Stiff-Legged_Barbell_Deadlift', 'terra-romeno': 'Stiff-Legged_Dumbbell_Deadlift', 'mesa-flexora': 'Lying_Leg_Curls',
  'cadeira-flexora': 'Seated_Leg_Curl', 'good-morning': 'Good_Morning', 'elevacao-quadril': 'Barbell_Hip_Thrust',
  'ponte-gluteo': 'Butt_Lift_Bridge', 'coice-polia': 'One-Legged_Cable_Kickback', abdutora: 'Thigh_Abductor',
  'kettlebell-swing': 'One-Arm_Kettlebell_Swings', adutora: 'Thigh_Adductor', 'panturrilha-pe': 'Standing_Calf_Raises',
  'panturrilha-sentado': 'Seated_Calf_Raise', 'panturrilha-leg': 'Calf_Press_On_The_Leg_Press_Machine', prancha: 'Plank',
  'prancha-lateral': 'Side_Bridge', abdominal: 'Crunches', 'elevacao-pernas': 'Flat_Bench_Lying_Leg_Raise', 'abdominal-polia': 'Cable_Crunch',
  'dead-bug': 'Dead_Bug', 'russian-twist': 'Russian_Twist', 'roda-abdominal': 'Ab_Roller', 'pular-corda': 'Rope_Jumping',
  'remada-invertida': 'Inverted_Row', 'afundo-corpo': 'Elevated_Back_Lunge', 'panturrilha-corpo': 'Rocking_Standing_Calf_Raise',
  'panturrilha-halter': 'Calf_Raise_On_A_Dumbbell', superman: 'Superman', 'flexao-pike': 'Handstand_Push-Ups',
  esteira: 'Running_Treadmill', caminhada: 'Walking_Treadmill', bike: 'Bicycling_Stationary', pedal: 'Bicycling',
  eliptico: 'Elliptical_Trainer', remo: 'Rowing_Stationary', escada: 'Stairmaster', corrida: 'Jogging_Treadmill'
};
for (const e of EXERCISES) if (IMG[e.id]) e.img = IMG[e.id];

export const KINDS = { musculacao: 'Musculação', corrida: 'Corrida', pedal: 'Pedal', cardio: 'Cardio' };

// Fichas prontas, montadas com base nas recomendações atuais de hipertrofia e força:
// cada músculo 2x por semana, ~10–20 séries semanais, compostos primeiro,
// faixas de repetições com descanso maior nos multiarticulares e séries a 1–3 reps da falha.
export const PRESETS_VERSION = 3;

// Atalhos: X(exercício, séries, repMín, repMáx, descanso, aquecimentos, dica)
const X = (exId, n, rmin, rmax, rest, warm = 0, notes = '') => ({
  exId, rest, notes,
  sets: [...Array.from({ length: warm }, () => ({ type: 'w', reps: 10 })), ...Array.from({ length: n }, () => ({ type: 'n', reps: rmin, ...(rmax > rmin ? { rmax } : {}) }))]
});
const T = (exId, n, sec, rest = 45, notes = '') => ({ exId, rest, notes, sets: Array.from({ length: n }, () => ({ type: 'n', sec })) });
const C = (exId, n, min, rest = 0, notes = '', km = null) => ({ exId, rest, notes, sets: Array.from({ length: n }, () => ({ type: 'n', min, ...(km ? { km } : {}) })) });

const RIR = 'Pare com 1–2 repetições “sobrando” (sem chegar à falha).';
const WARM = 'Comece pela série de aquecimento leve (A). ' + RIR;

export const PROGRAMS = [
  { id: 'fb3', name: 'Full-body 3x · Iniciante', desc: '3 dias por semana (ex.: seg, qua, sex), alternando A, B e C. Corpo todo em cada treino, ~50 min.' },
  { id: 'ul4', name: 'Superior/Inferior 4x · Intermediário', desc: '4 dias (ex.: seg, ter, qui, sex). Treinos A focados em força, B em volume.' },
  { id: 'ppl', name: 'Push/Pull/Legs · Avançado', desc: '6 dias seguidos com 1 de descanso, ou 3 dias para quem tem menos tempo.' },
  { id: 'casa', name: 'Em casa · Sem equipamento', desc: 'Para dias sem academia. Faça em circuito se quiser mais intensidade.' },
  { id: 'corrida', name: 'Corrida', desc: 'Comece pelo corre-caminha se está voltando. Faça 80% dos treinos em ritmo leve (dá para conversar).' },
  { id: 'pedal', name: 'Pedal', desc: 'Base em zona 2 (leve, respiração controlada) e 1 treino intervalado por semana.' }
];

export const PRESET_ROUTINES = [
  // Full-body 3x
  { program: 'fb3', name: 'Full-body A', kind: 'musculacao', ex: [
    X('agachamento-livre', 3, 6, 8, 150, 1, WARM), X('supino-reto-barra', 3, 6, 8, 150, 1, WARM),
    X('puxada-frontal', 3, 8, 12, 120, 0, RIR), X('terra-romeno', 3, 8, 12, 120, 0, 'Quadril para trás, coluna neutra, sinta o alongamento do posterior.'),
    X('elevacao-lateral', 2, 12, 15, 60), T('prancha', 3, 30, 45, 'Contraia glúteos e abdômen; não deixe o quadril cair.')] },
  { program: 'fb3', name: 'Full-body B', kind: 'musculacao', ex: [
    X('leg-press', 3, 10, 12, 120, 1, WARM), X('desenvolvimento-halter', 3, 8, 12, 120, 0, RIR),
    X('remada-unilateral', 3, 8, 12, 90, 0, 'Puxe o cotovelo em direção ao quadril.'), X('supino-inclinado-halter', 3, 8, 12, 120, 0, RIR),
    X('mesa-flexora', 3, 10, 15, 90), X('abdominal-polia', 3, 10, 15, 60)] },
  { program: 'fb3', name: 'Full-body C', kind: 'musculacao', ex: [
    X('bulgaro', 3, 8, 12, 120, 0, 'Comece pela perna mais fraca. Repetições por perna.'), X('supino-reto-halter', 3, 8, 12, 120, 0, RIR),
    X('remada-baixa', 3, 10, 12, 90, 0, 'Peito alto, escápulas para trás no fim.'), X('elevacao-quadril', 3, 8, 12, 120, 0, 'Segure 1 segundo no topo.'),
    X('rosca-direta', 2, 10, 12, 60), X('triceps-corda', 2, 10, 15, 60)] },

  // Superior/Inferior 4x
  { program: 'ul4', name: 'Superior A · Força', kind: 'musculacao', ex: [
    X('supino-reto-barra', 4, 5, 8, 180, 2, WARM), X('remada-curvada', 4, 6, 8, 150, 1, WARM),
    X('desenvolvimento-halter', 3, 8, 10, 120), X('puxada-frontal', 3, 8, 12, 120),
    X('rosca-direta', 2, 8, 12, 60), X('triceps-testa', 2, 8, 12, 60)] },
  { program: 'ul4', name: 'Inferior A · Força', kind: 'musculacao', ex: [
    X('agachamento-livre', 4, 5, 8, 180, 2, WARM), X('terra-romeno', 3, 8, 10, 150),
    X('leg-press', 3, 10, 12, 120), X('mesa-flexora', 3, 10, 12, 90),
    X('panturrilha-pe', 4, 10, 15, 60, 0, 'Pausa de 1 s embaixo, alongando bem.'), X('elevacao-pernas', 3, 10, 15, 60)] },
  { program: 'ul4', name: 'Superior B · Volume', kind: 'musculacao', ex: [
    X('supino-inclinado-halter', 3, 8, 12, 120, 1, WARM), X('puxada-supinada', 3, 8, 12, 120),
    X('remada-maquina', 3, 10, 12, 90), X('crossover', 3, 12, 15, 60),
    X('elevacao-lateral', 4, 12, 20, 60, 0, 'Ótimo exercício para drop set na última série.'), X('face-pull', 3, 15, 20, 60),
    X('rosca-inclinada', 3, 10, 12, 60), X('triceps-corda', 3, 10, 15, 60)] },
  { program: 'ul4', name: 'Inferior B · Volume', kind: 'musculacao', ex: [
    X('levantamento-terra', 3, 4, 6, 180, 2, WARM), X('bulgaro', 3, 8, 12, 120),
    X('elevacao-quadril', 3, 8, 12, 120), X('cadeira-extensora', 3, 12, 15, 60),
    X('cadeira-flexora', 3, 12, 15, 60), X('panturrilha-sentado', 4, 12, 20, 60)] },

  // Push/Pull/Legs
  { program: 'ppl', name: 'Push · Peito, ombro e tríceps', kind: 'musculacao', ex: [
    X('supino-reto-barra', 4, 6, 8, 180, 2, WARM), X('desenvolvimento-barra', 3, 6, 10, 150),
    X('supino-inclinado-halter', 3, 8, 12, 120), X('elevacao-lateral', 4, 12, 20, 60),
    X('voador', 3, 12, 15, 60), X('triceps-corda', 3, 10, 15, 60), X('triceps-frances', 3, 10, 12, 60)] },
  { program: 'ppl', name: 'Pull · Costas e bíceps', kind: 'musculacao', ex: [
    X('barra-fixa', 4, 6, 10, 150, 0, 'Sem conseguir? Troque pela barra assistida.'), X('remada-curvada', 3, 6, 10, 150, 1, WARM),
    X('remada-baixa', 3, 10, 12, 90), X('pulldown', 3, 12, 15, 60),
    X('face-pull', 3, 15, 20, 60), X('rosca-direta', 3, 8, 12, 60), X('rosca-martelo', 3, 10, 12, 60)] },
  { program: 'ppl', name: 'Legs · Pernas e glúteos', kind: 'musculacao', ex: [
    X('agachamento-livre', 4, 6, 8, 180, 2, WARM), X('stiff', 3, 8, 10, 150),
    X('leg-press', 3, 10, 15, 120), X('cadeira-extensora', 3, 12, 15, 60),
    X('mesa-flexora', 3, 10, 15, 60), X('panturrilha-pe', 4, 10, 15, 60), X('abdominal-polia', 3, 10, 15, 60)] },

  // Em casa
  { program: 'casa', name: 'Corpo todo em casa', kind: 'musculacao', ex: [
    X('flexao', 3, 8, 15, 90, 0, 'Fácil demais? Pés elevados. Difícil? Mãos num banco.'), X('agachamento-corpo', 3, 15, 20, 60),
    X('ponte-gluteo', 3, 15, 20, 60), X('mergulho-banco', 3, 10, 15, 60),
    X('dead-bug', 3, 8, 10, 45, 0, 'Repetições por lado, lombar colada no chão.'), T('prancha', 3, 40, 45)] },
  { program: 'casa', name: 'HIIT em casa', kind: 'cardio', ex: [
    T('polichinelo', 4, 40, 20, 'Esforço alto: 40 s de trabalho, 20 s de pausa.'), X('burpee', 4, 8, 12, 30),
    X('agachamento-corpo', 4, 15, 20, 30), T('prancha', 3, 30, 30)] },

  // Corrida
  { program: 'corrida', name: 'Corre-caminha · Iniciante', kind: 'corrida', ex: [
    C('caminhada', 1, 5, 0, 'Aquecimento: caminhada rápida.'),
    C('corrida', 8, 1, 90, 'Corra 1 min e caminhe durante o descanso (1 min 30 s). A cada semana, aumente a corrida.'),
    C('caminhada', 1, 5, 0, 'Volta à calma.')] },
  { program: 'corrida', name: 'Corrida leve · Zona 2', kind: 'corrida', ex: [
    C('caminhada', 1, 5, 0, 'Aquecimento.'), C('corrida', 1, 30, 0, 'Ritmo de conversa: se não dá para falar frases, diminua.'), C('caminhada', 1, 5, 0, 'Volta à calma.')] },
  { program: 'corrida', name: 'Corrida intervalada', kind: 'corrida', ex: [
    C('corrida', 1, 10, 0, 'Aquecimento bem leve.'), C('corrida', 6, 3, 120, 'Tiros de 3 min em ritmo forte (difícil falar). Trote leve no descanso.'), C('corrida', 1, 10, 0, 'Desaquecimento leve.')] },
  { program: 'corrida', name: 'Longão', kind: 'corrida', ex: [
    C('corrida', 1, 60, 0, 'Bem leve, 1 vez por semana. Aumente no máximo 10% por semana.')] },

  // Pedal
  { program: 'pedal', name: 'Pedal zona 2', kind: 'pedal', ex: [
    C('pedal', 1, 60, 0, 'Intensidade leve e constante; dá para conversar.')] },
  { program: 'pedal', name: 'Pedal intervalado', kind: 'pedal', ex: [
    C('bike', 1, 10, 0, 'Aquecimento leve.'), C('bike', 5, 4, 180, '4 min forte, 3 min girando leve no descanso.'), C('bike', 1, 10, 0, 'Desaquecimento.')] }
];

// Nomes das fichas antigas (versão 1), substituídas na atualização
export const OLD_PRESET_NAMES = ['Full-body A', 'Full-body B', 'Peito e tríceps', 'Costas e bíceps', 'Pernas e glúteos', 'Ombros e abdômen', 'Corrida leve', 'Pedal no seu ritmo', 'Cardio em casa'];
