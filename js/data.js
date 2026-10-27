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
  esteira: 'Running_Treadmill', caminhada: 'Walking_Treadmill', bike: 'Bicycling_Stationary', pedal: 'Bicycling',
  eliptico: 'Elliptical_Trainer', remo: 'Rowing_Stationary', escada: 'Stairmaster', corrida: 'Jogging_Treadmill'
};
for (const e of EXERCISES) if (IMG[e.id]) e.img = IMG[e.id];

export const KINDS = { musculacao: 'Musculação', corrida: 'Corrida', pedal: 'Pedal', cardio: 'Cardio' };

// Atalhos para descrever séries-alvo
const S = (n, reps, rest = 90) => ({ rest, sets: Array.from({ length: n }, () => ({ reps })) });
const T = (n, sec, rest = 45) => ({ rest, sets: Array.from({ length: n }, () => ({ sec })) });
const C = (km, min) => ({ rest: 0, sets: [{ km, min }] });

export const PRESET_ROUTINES = [
  { name: 'Full-body A', kind: 'musculacao', ex: [['agachamento-goblet', S(3, 10)], ['supino-reto-halter', S(3, 10)], ['remada-baixa', S(3, 10)], ['terra-romeno', S(3, 10)], ['prancha', T(3, 30)]] },
  { name: 'Full-body B', kind: 'musculacao', ex: [['leg-press', S(3, 12)], ['puxada-frontal', S(3, 10)], ['desenvolvimento-halter', S(3, 10)], ['elevacao-quadril', S(3, 10)], ['abdominal', S(3, 15, 45)]] },
  { name: 'Peito e tríceps', kind: 'musculacao', ex: [['supino-reto-barra', S(4, 8, 120)], ['supino-inclinado-halter', S(3, 10)], ['voador', S(3, 12, 60)], ['triceps-corda', S(3, 12, 60)], ['triceps-frances', S(3, 10, 60)]] },
  { name: 'Costas e bíceps', kind: 'musculacao', ex: [['puxada-frontal', S(4, 10)], ['remada-curvada', S(3, 8, 120)], ['remada-unilateral', S(3, 10)], ['face-pull', S(3, 15, 60)], ['rosca-direta', S(3, 10, 60)], ['rosca-martelo', S(3, 12, 60)]] },
  { name: 'Pernas e glúteos', kind: 'musculacao', ex: [['agachamento-livre', S(4, 8, 150)], ['leg-press', S(3, 12, 120)], ['cadeira-extensora', S(3, 12, 60)], ['mesa-flexora', S(3, 12, 60)], ['elevacao-quadril', S(3, 10)], ['panturrilha-pe', S(4, 15, 45)]] },
  { name: 'Ombros e abdômen', kind: 'musculacao', ex: [['desenvolvimento-halter', S(4, 10)], ['elevacao-lateral', S(3, 12, 60)], ['crucifixo-inverso', S(3, 12, 60)], ['encolhimento', S(3, 12, 60)], ['prancha', T(3, 40)], ['elevacao-pernas', S(3, 12, 45)]] },
  { name: 'Corrida leve', kind: 'corrida', ex: [['caminhada', C(0.5, 5)], ['corrida', C(3, 20)], ['caminhada', C(0.5, 5)]] },
  { name: 'Pedal no seu ritmo', kind: 'pedal', ex: [['pedal', C(15, 45)]] },
  { name: 'Cardio em casa', kind: 'cardio', ex: [['polichinelo', T(3, 45, 30)], ['burpee', S(3, 10, 45)], ['agachamento-corpo', S(3, 15, 45)], ['prancha', T(3, 30, 30)]] }
];
