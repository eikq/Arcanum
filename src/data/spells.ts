import { Spell } from '@/types/game';

// Comprehensive Harry Potter spell database with aliases and phonetic matching
export const SPELL_DATABASE: Spell[] = [
  // OFFENSIVE SPELLS
  {
    id: 'expelliarmus',
    name: 'Expelliarmus',
    element: 'light',
    difficulty: 'medium',
    type: 'attack',
    aliases: ['expeliarmus', 'expelliamus', 'disarm', 'disarm spell', 'expel-lee-are-mus', 'expelyarmus', 'expe-li-ar-mus'],
    phonemes: ['EH K S P EH L IY AA R M AH S'],
    icon: '🪄',
    damage: 45,
    manaCost: 25,
    cooldown: 1200
  },
  {
    id: 'stupefy',
    name: 'Stupefy',
    element: 'arcane',
    difficulty: 'easy',
    type: 'attack',
    aliases: ['stupify', 'stoo-pe-fy', 'stu-pe-fai', 'stupifai', 'stupfy', 'stu-pe-fi'],
    phonemes: ['S T UW P AH F AY'],
    icon: '⚡',
    damage: 35,
    manaCost: 20,
    cooldown: 1000
  },
  {
    id: 'avadakedavra',
    name: 'Avada Kedavra',
    element: 'shadow',
    difficulty: 'veryhard',
    type: 'attack',
    aliases: ['avada kedavra', 'killing curse', 'avada-kedavra', 'avada', 'kedavra', 'a-va-da ke-da-vra'],
    phonemes: ['AH V AA D AH K EH D AA V R AH'],
    icon: '💀',
    damage: 999,
    manaCost: 100,
    cooldown: 10000
  },
  {
    id: 'crucio',
    name: 'Crucio',
    element: 'shadow',
    difficulty: 'hard',
    type: 'attack',
    aliases: ['cruci-o', 'torture curse', 'crucio curse', 'croo-she-oh'],
    phonemes: ['K R UW S IY OW'],
    icon: '⚡',
    damage: 60,
    manaCost: 40,
    cooldown: 3000
  },
  {
    id: 'sectumsempra',
    name: 'Sectumsempra',
    element: 'shadow',
    difficulty: 'veryhard',
    type: 'attack',
    aliases: ['sectum sempra', 'sectum-sempra', 'sec-tum-sem-pra'],
    phonemes: ['S EH K T AH M S EH M P R AH'],
    icon: '⚔️',
    damage: 80,
    manaCost: 60,
    cooldown: 5000
  },
  {
    id: 'confringo',
    name: 'Confringo',
    element: 'fire',
    difficulty: 'hard',
    type: 'attack',
    aliases: ['blasting curse', 'con-frin-go', 'confrin-go'],
    phonemes: ['K AH N F R IH NG G OW'],
    icon: '💥',
    damage: 70,
    manaCost: 45,
    cooldown: 2500
  },
  {
    id: 'reducto',
    name: 'Reducto',
    element: 'lightning',
    difficulty: 'medium',
    type: 'attack',
    aliases: ['reductor curse', 're-duc-to', 'reducer'],
    phonemes: ['R IH D AH K T OW'],
    icon: '⚡',
    damage: 50,
    manaCost: 30,
    cooldown: 1500
  },

  // DEFENSIVE SPELLS
  {
    id: 'protego',
    name: 'Protego',
    element: 'light',
    difficulty: 'medium',
    type: 'shield',
    aliases: ['shield charm', 'pro-te-go', 'protective charm', 'protect'],
    phonemes: ['P R OW T EH G OW'],
    icon: '🛡️',
    manaCost: 25,
    cooldown: 2000
  },
  {
    id: 'protegomaxima',
    name: 'Protego Maxima',
    element: 'light',
    difficulty: 'hard',
    type: 'shield',
    aliases: ['protego maxima', 'maximum protection', 'pro-te-go max-i-ma'],
    phonemes: ['P R OW T EH G OW M AE K S IH M AH'],
    icon: '🛡️',
    manaCost: 50,
    cooldown: 5000
  },
  {
    id: 'protegodiabolica',
    name: 'Protego Diabolica',
    element: 'fire',
    difficulty: 'veryhard',
    type: 'shield',
    aliases: ['protego diabolica', 'diabolic protection', 'fire shield'],
    phonemes: ['P R OW T EH G OW D AY AH B AA L IH K AH'],
    icon: '🔥',
    manaCost: 80,
    cooldown: 8000
  },

  // HEALING SPELLS
  {
    id: 'episkey',
    name: 'Episkey',
    element: 'light',
    difficulty: 'medium',
    type: 'heal',
    aliases: ['healing charm', 'e-pis-key', 'episky'],
    phonemes: ['EH P IH S K IY'],
    icon: '💚',
    healing: 40,
    manaCost: 30,
    cooldown: 3000
  },
  {
    id: 'vulnerasanentur',
    name: 'Vulnera Sanentur',
    element: 'light',
    difficulty: 'hard',
    type: 'heal',
    aliases: ['vulnera sanentur', 'wound healing', 'vul-ne-ra sa-nen-tur'],
    phonemes: ['V AH L N EH R AH S AA N EH N T ER'],
    icon: '💚',
    healing: 80,
    manaCost: 60,
    cooldown: 8000
  },

  // UTILITY SPELLS
  {
    id: 'lumos',
    name: 'Lumos',
    element: 'light',
    difficulty: 'easy',
    type: 'utility',
    aliases: ['light charm', 'loo-mos', 'lummos', 'illuminate'],
    phonemes: ['L UW M AH S'],
    icon: '💡',
    manaCost: 10,
    cooldown: 500
  },
  {
    id: 'nox',
    name: 'Nox',
    element: 'shadow',
    difficulty: 'easy',
    type: 'utility',
    aliases: ['darkness', 'extinguish', 'dark'],
    phonemes: ['N AA K S'],
    icon: '🌑',
    manaCost: 5,
    cooldown: 500
  },
  {
    id: 'alohomora',
    name: 'Alohomora',
    element: 'arcane',
    difficulty: 'easy',
    type: 'utility',
    aliases: ['unlocking charm', 'alo-ho-mora', 'unlock'],
    phonemes: ['AH L OW HH OW M OW R AH'],
    icon: '🗝️',
    manaCost: 15,
    cooldown: 1000
  },
  {
    id: 'accio',
    name: 'Accio',
    element: 'wind',
    difficulty: 'medium',
    type: 'utility',
    aliases: ['summoning charm', 'ak-see-oh', 'summon'],
    phonemes: ['AE K S IY OW'],
    icon: '🌪️',
    manaCost: 20,
    cooldown: 1500
  },
  {
    id: 'wingardiumleviosa',
    name: 'Wingardium Leviosa',
    element: 'wind',
    difficulty: 'medium',
    type: 'utility',
    aliases: ['levitation charm', 'wing-ar-dium levi-o-sa', 'levitate', 'float'],
    phonemes: ['W IH NG G AA R D IY AH M L EH V IY OW S AH'],
    icon: '🪶',
    manaCost: 25,
    cooldown: 2000
  },
  {
    id: 'reparo',
    name: 'Reparo',
    element: 'earth',
    difficulty: 'easy',
    type: 'utility',
    aliases: ['mending charm', 're-pa-ro', 'repair', 'fix'],
    phonemes: ['R EH P AA R OW'],
    icon: '🔧',
    manaCost: 20,
    cooldown: 1500
  },
  {
    id: 'imperio',
    name: 'Imperio',
    element: 'shadow',
    difficulty: 'veryhard',
    type: 'utility',
    aliases: ['imperius curse', 'control curse', 'im-pe-ri-o'],
    phonemes: ['IH M P EH R IY OW'],
    icon: '👁️',
    manaCost: 70,
    cooldown: 10000
  },
  {
    id: 'expecto',
    name: 'Expecto Patronum',
    element: 'light',
    difficulty: 'veryhard',
    type: 'utility',
    aliases: ['patronus charm', 'expecto patronum', 'ex-pec-to pa-tro-num', 'patronus'],
    phonemes: ['EH K S P EH K T OW P AH T R OW N AH M'],
    icon: '🦌',
    manaCost: 80,
    cooldown: 12000
  },

  // ELEMENTAL SPELLS
  {
    id: 'incendio',
    name: 'Incendio',
    element: 'fire',
    difficulty: 'medium',
    type: 'attack',
    aliases: ['fire spell', 'in-cen-di-o', 'flame'],
    phonemes: ['IH N S EH N D IY OW'],
    icon: '🔥',
    damage: 45,
    manaCost: 30,
    cooldown: 2000
  },
  {
    id: 'aguamenti',
    name: 'Aguamenti',
    element: 'water',
    difficulty: 'medium',
    type: 'utility',
    aliases: ['water spell', 'aqua-men-ti', 'water charm'],
    phonemes: ['AH G W AH M EH N T IY'],
    icon: '💧',
    manaCost: 25,
    cooldown: 1500
  },
  {
    id: 'glacius',
    name: 'Glacius',
    element: 'ice',
    difficulty: 'medium',
    type: 'attack',
    aliases: ['freezing spell', 'gla-ci-us', 'ice spell', 'freeze'],
    phonemes: ['G L AE S IY AH S'],
    icon: '❄️',
    damage: 40,
    manaCost: 30,
    cooldown: 2000
  },
  {
    id: 'ventus',
    name: 'Ventus',
    element: 'wind',
    difficulty: 'easy',
    type: 'utility',
    aliases: ['wind spell', 'ven-tus', 'gust'],
    phonemes: ['V EH N T AH S'],
    icon: '💨',
    manaCost: 15,
    cooldown: 1000
  }
];

// IP-Safe mode mappings
export const IP_SAFE_NAMES: Record<string, string> = {
  'expelliarmus': 'Disarm Strike',
  'stupefy': 'Stun Bolt',
  'avadakedavra': 'Death Ray',
  'crucio': 'Pain Curse',
  'sectumsempra': 'Slash Strike',
  'confringo': 'Blast Wave',
  'reducto': 'Shatter Bolt',
  'protego': 'Shield Ward',
  'protegomaxima': 'Greater Shield',
  'protegodiabolica': 'Fire Barrier',
  'episkey': 'Heal Touch',
  'vulnerasanentur': 'Greater Heal',
  'lumos': 'Light Orb',
  'nox': 'Darkness',
  'alohomora': 'Unlock',
  'accio': 'Summon',
  'wingardiumleviosa': 'Levitate',
  'reparo': 'Mend',
  'imperio': 'Mind Control',
  'expecto': 'Spirit Guardian',
  'incendio': 'Flame Burst',
  'aguamenti': 'Water Stream',
  'glacius': 'Ice Shard',
  'ventus': 'Wind Gust'
};

// Elemental interactions and combos
export const ELEMENTAL_COMBOS = [
  { elements: ['fire', 'wind'], name: 'Inferno Cyclone', multiplier: 1.5, effect: 'Burning tornado' },
  { elements: ['lightning', 'water'], name: 'Thunderstorm Surge', multiplier: 1.6, effect: 'Electrified water' },
  { elements: ['ice', 'wind'], name: 'Hail Tempest', multiplier: 1.4, effect: 'Freezing winds' },
  { elements: ['nature', 'water'], name: 'Blooming Torrent', multiplier: 1.3, effect: 'Healing flood' },
  { elements: ['light', 'arcane'], name: 'Aether Lance', multiplier: 1.7, effect: 'Pure energy beam' },
  { elements: ['shadow', 'ice'], name: 'Umbral Shatter', multiplier: 1.5, effect: 'Dark frost' },
  { elements: ['fire', 'earth'], name: 'Magma Burst', multiplier: 1.6, effect: 'Molten explosion' },
  { elements: ['nature', 'light'], name: 'Sanctified Vines', multiplier: 1.4, effect: 'Binding heal over time' }
] as const;

// Elemental weaknesses
export const ELEMENTAL_WEAKNESSES = {
  fire: 'water',
  water: 'lightning',
  lightning: 'earth',
  earth: 'wind',
  wind: 'fire',
  nature: 'fire',
  ice: 'fire',
  shadow: 'light',
  light: 'shadow',
  arcane: 'none'
} as const;