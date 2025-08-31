import { SPELL_DATABASE } from '@/data/spells';
import { Spell, SpellElement } from '@/types/game';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

interface BotPreset {
  accuracy: [number, number]; // min, max accuracy
  interval: [number, number]; // min, max interval between casts (ms)
  loudnessVariation: number; // how much loudness varies
  elementalAwareness: number; // chance to use counters (0-1)
}

const BOT_PRESETS: Record<BotDifficulty, BotPreset> = {
  easy: {
    accuracy: [0.55, 0.7],
    interval: [2500, 3200],
    loudnessVariation: 0.3,
    elementalAwareness: 0.2,
  },
  medium: {
    accuracy: [0.65, 0.85],
    interval: [1800, 2400],
    loudnessVariation: 0.2,
    elementalAwareness: 0.5,
  },
  hard: {
    accuracy: [0.8, 0.95],
    interval: [1200, 1800],
    loudnessVariation: 0.1,
    elementalAwareness: 0.8,
  },
};

const ELEMENTAL_COUNTERS: Record<SpellElement, SpellElement[]> = {
  fire: ['water', 'ice'],
  water: ['lightning'],
  ice: ['fire'],
  lightning: ['earth'],
  earth: ['wind'],
  wind: ['fire'],
  nature: ['fire'],
  shadow: ['light'],
  light: ['shadow'],
  arcane: [], // Arcane has no hard counters
};

export class BotOpponent {
  private difficulty: BotDifficulty;
  private preset: BotPreset;
  private lastCastTime = 0;
  private cooldowns = new Map<string, number>();
  private hp = 100;
  private maxHp = 100;
  private mana = 100;
  private maxMana = 100;
  private isActive = false;
  private castCallback?: (cast: any) => void;
  private nextCastTimer?: NodeJS.Timeout;

  constructor(difficulty: BotDifficulty = 'medium') {
    this.difficulty = difficulty;
    this.preset = BOT_PRESETS[difficulty];
  }

  start(onCast: (cast: any) => void): void {
    this.castCallback = onCast;
    this.isActive = true;
    this.scheduleNextCast();
  }

  stop(): void {
    this.isActive = false;
    if (this.nextCastTimer) {
      clearTimeout(this.nextCastTimer);
      this.nextCastTimer = undefined;
    }
  }

  takeDamage(damage: number): void {
    this.hp = Math.max(0, this.hp - damage);
    if (this.hp <= 0) {
      this.stop();
    }
  }

  getStats() {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      mana: this.mana,
      maxMana: this.maxMana,
      difficulty: this.difficulty,
    };
  }

  private scheduleNextCast(): void {
    if (!this.isActive) return;

    const [minInterval, maxInterval] = this.preset.interval;
    const interval = minInterval + Math.random() * (maxInterval - minInterval);

    this.nextCastTimer = setTimeout(() => {
      this.performCast();
      this.scheduleNextCast();
    }, interval);
  }

  private performCast(): void {
    if (!this.castCallback || !this.isActive) return;

    const spell = this.selectSpell();
    if (!spell) return;

    // Check cooldown
    const now = performance.now();
    const lastCast = this.cooldowns.get(spell.id) || 0;
    const cooldownTime = this.getSpellCooldown(spell);
    
    if (now - lastCast < cooldownTime) {
      return; // Spell still on cooldown
    }

    // Generate bot accuracy and loudness
    const [minAcc, maxAcc] = this.preset.accuracy;
    const accuracy = minAcc + Math.random() * (maxAcc - minAcc);
    
    const baseLoudness = 0.6;
    const loudnessVariation = this.preset.loudnessVariation;
    const loudness = Math.max(0.1, Math.min(1.0, 
      baseLoudness + (Math.random() - 0.5) * loudnessVariation
    ));

    // Calculate power
    const power = Math.min(1.0, accuracy * 0.7 + loudness * 0.3);

    // Create cast payload
    const castPayload = {
      roomId: 'bot-room',
      spellId: spell.id,
      accuracy,
      loudness,
      power,
      ts: now,
      isBot: true,
    };

    // Update cooldown
    this.cooldowns.set(spell.id, now);
    this.lastCastTime = now;

    // Consume mana
    const manaCost = spell.manaCost || 20;
    this.mana = Math.max(0, this.mana - manaCost);

    // Trigger callback
    this.castCallback(castPayload);

    // Regenerate mana over time
    setTimeout(() => {
      this.mana = Math.min(this.maxMana, this.mana + 10);
    }, 1000);
  }

  private selectSpell(): Spell | null {
    // Filter available spells by mana and cooldown
    const availableSpells = SPELL_DATABASE.filter(spell => {
      const manaCost = spell.manaCost || 20;
      if (this.mana < manaCost) return false;

      const now = performance.now();
      const lastCast = this.cooldowns.get(spell.id) || 0;
      const cooldownTime = this.getSpellCooldown(spell);
      
      return now - lastCast >= cooldownTime;
    });

    if (availableSpells.length === 0) return null;

    // Bot AI: prefer spells based on difficulty and situation
    let weightedSpells = availableSpells.map(spell => ({
      spell,
      weight: this.calculateSpellWeight(spell),
    }));

    // Sort by weight and add some randomness
    weightedSpells.sort((a, b) => b.weight - a.weight);
    
    // Top 3 spells get higher selection chance
    const topSpells = weightedSpells.slice(0, 3);
    const weights = topSpells.map((_, i) => Math.pow(0.7, i)); // Exponential decay
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < topSpells.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return topSpells[i].spell;
      }
    }

    return topSpells[0]?.spell || availableSpells[0];
  }

  private calculateSpellWeight(spell: Spell): number {
    let weight = 1.0;

    // Prefer attack spells when enemy has high HP
    if (spell.type === 'attack') {
      weight += 2.0;
    }

    // Prefer healing when bot HP is low
    if (spell.type === 'heal' && this.hp < this.maxHp * 0.4) {
      weight += 3.0;
    }

    // Prefer shields when taking damage
    if (spell.type === 'shield' && this.hp < this.maxHp * 0.6) {
      weight += 1.5;
    }

    // Difficulty-based preferences
    switch (this.difficulty) {
      case 'hard':
        // Hard bots prefer higher damage spells
        if (spell.damage && spell.damage > 50) {
          weight += 1.0;
        }
        break;
      case 'easy':
        // Easy bots prefer simpler spells
        if (spell.difficulty === 'easy') {
          weight += 0.5;
        }
        break;
    }

    // Add some randomness
    weight *= 0.8 + Math.random() * 0.4;

    return weight;
  }

  private getSpellCooldown(spell: Spell): number {
    // Base cooldown from spell data, with some variation
    const baseCooldown = spell.cooldown || 1500;
    const difficultyMultiplier = this.difficulty === 'hard' ? 0.8 : 
                                this.difficulty === 'easy' ? 1.2 : 1.0;
    
    return baseCooldown * difficultyMultiplier;
  }
}

export const createBotOpponent = (difficulty: BotDifficulty) => new BotOpponent(difficulty);