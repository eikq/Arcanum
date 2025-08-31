// Game Type Definitions

export interface Spell {
  id: string;
  name: string;
  element: SpellElement;
  difficulty: SpellDifficulty;
  type: SpellType;
  aliases: string[];
  phonemes: string[];
  icon: string;
  damage?: number;
  healing?: number;
  cooldown?: number;
  manaCost?: number;
}

export type SpellElement = 
  | 'fire' 
  | 'ice' 
  | 'lightning' 
  | 'nature' 
  | 'shadow' 
  | 'light' 
  | 'arcane' 
  | 'water' 
  | 'wind' 
  | 'earth';

export type SpellDifficulty = 'easy' | 'medium' | 'hard' | 'veryhard';

export type SpellType = 'attack' | 'shield' | 'heal' | 'utility';

export interface Player {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  level: number;
  experience: number;
  isConnected: boolean;
}

export interface GameState {
  players: Player[];
  currentTurn: string;
  isActive: boolean;
  mode: GameMode;
  roomId?: string;
  vsBot?: boolean;
}

export type GameMode = 'quick' | 'code' | 'bot' | 'practice';

export interface CastResult {
  spellId: string;
  accuracy: number;
  loudness: number;
  power: number;
  timestamp: number;
  success: boolean;
}

export interface VoiceRecognitionState {
  isListening: boolean;
  isSupported: boolean;
  hasPermission: boolean;
  transcript: string;
  confidence: number;
  loudness: number;
}

export interface GameSettings {
  srLanguage: string;
  sensitivity: number;
  hotwordEnabled: boolean;
  ipSafeMode: boolean;
  minAccuracy: number;
  alwaysCast: boolean;
  micSensitivity: number;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  voiceVolume: number;
  highContrast: boolean;
  fontSize: number;
}

export interface ElementalCombo {
  elements: [SpellElement, SpellElement];
  name: string;
  multiplier: number;
  effect: string;
}

export interface AssetManifest {
  version: string;
  assets: GameAsset[];
  ui: {
    icons: UIIcon[];
  };
}

export interface GameAsset {
  id: string;
  type: 'sprite' | 'sfx' | 'music' | 'shader';
  element?: SpellElement;
  src: string;
  frames?: number;
  fps?: number;
  loop?: boolean;
  hitbox?: { w: number; h: number };
  pivot?: { x: number; y: number };
  recommendedBlend?: string;
  sfx?: {
    castId: string;
    impactId: string;
  };
}

export interface UIIcon {
  id: string;
  spellId: string;
  path: string;
  size: string;
}