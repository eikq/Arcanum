import { Spell } from '@/types/game';
import { SPELL_DATABASE } from '@/data/spells';

interface SpellMatch {
  spell: Spell;
  accuracy: number;
  matchType: 'exact' | 'alias' | 'phonetic';
}

// Fallback spell for when no good match is found
const ARCANE_BURST: Spell = {
  id: 'arcane_burst',
  name: 'Arcane Burst',
  element: 'arcane',
  difficulty: 'easy',
  type: 'attack',
  aliases: ['burst', 'blast', 'magic'],
  phonemes: ['AA R K EY N B ER S T'],
  icon: '✨',
  damage: 25,
  manaCost: 15,
  cooldown: 1000
};

interface MatchResult {
  spell: Spell;
  score: number;
  matched: boolean;
}
// Fallback spell for when no good match is found
const ARCANE_BURST: Spell = {
  id: 'arcane_burst',
  name: 'Arcane Burst',
  element: 'arcane',
  difficulty: 'easy',
  type: 'attack',
  aliases: ['burst', 'blast', 'magic'],
  phonemes: ['AA R K EY N B ER S T'],
  icon: '✨',
  damage: 25,
  manaCost: 15,
  cooldown: 1000
};

interface MatchResult {
  spell: Spell;
  score: number;
  matched: boolean;
}

// Phonetic similarity using simplified Levenshtein distance
function calculatePhoneticSimilarity(input: string, target: string): number {
  const inputClean = input.toLowerCase().replace(/[^a-z]/g, '');
  const targetClean = target.toLowerCase().replace(/[^a-z]/g, '');
  
  if (inputClean === targetClean) return 1.0;
  
  const matrix: number[][] = [];
  const inputLen = inputClean.length;
  const targetLen = targetClean.length;
  
  // Initialize matrix
  for (let i = 0; i <= inputLen; i++) {
    matrix[i] = [];
    matrix[i][0] = i;
  }
  
  for (let j = 0; j <= targetLen; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= inputLen; i++) {
    for (let j = 1; j <= targetLen; j++) {
      const cost = inputClean[i - 1] === targetClean[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[inputLen][targetLen];
  const maxLen = Math.max(inputLen, targetLen);
  
  return maxLen === 0 ? 1.0 : 1.0 - (distance / maxLen);
}

// Calculate fuzzy match score
function calculateFuzzyMatch(input: string, target: string): number {
  const inputLower = input.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();
  
  // Exact match
  if (inputLower === targetLower) return 1.0;
  
  // Contains match
  if (targetLower.includes(inputLower) || inputLower.includes(targetLower)) {
    const shorter = inputLower.length < targetLower.length ? inputLower : targetLower;
    const longer = inputLower.length >= targetLower.length ? inputLower : targetLower;
    return shorter.length / longer.length * 0.9;
  }
  
  // Phonetic similarity
  return calculatePhoneticSimilarity(inputLower, targetLower);
}

// Find best spell matches for a given transcript
export function findSpellMatches(
  transcript: string, 
  threshold = 0.6,
  maxResults = 3
): SpellMatch[] {
  const matches: SpellMatch[] = [];
  const cleanTranscript = transcript.toLowerCase().trim();
  
  if (!cleanTranscript) return matches;
  
  for (const spell of SPELL_DATABASE) {
    let bestAccuracy = 0;
    let matchType: 'exact' | 'alias' | 'phonetic' = 'phonetic';
    
    // Check exact name match
    const nameAccuracy = calculateFuzzyMatch(cleanTranscript, spell.name);
    if (nameAccuracy > bestAccuracy) {
      bestAccuracy = nameAccuracy;
      matchType = nameAccuracy >= 0.95 ? 'exact' : 'phonetic';
    }
    
    // Check alias matches
    for (const alias of spell.aliases) {
      const aliasAccuracy = calculateFuzzyMatch(cleanTranscript, alias);
      if (aliasAccuracy > bestAccuracy) {
        bestAccuracy = aliasAccuracy;
        matchType = aliasAccuracy >= 0.95 ? 'alias' : 'phonetic';
      }
    }
    
    // Check phoneme matches (simplified)
    for (const phoneme of spell.phonemes) {
      const phonemeAccuracy = calculatePhoneticSimilarity(cleanTranscript, phoneme);
      if (phonemeAccuracy > bestAccuracy && phonemeAccuracy > 0.7) {
        bestAccuracy = phonemeAccuracy;
        matchType = 'phonetic';
      }
    }
    
    if (bestAccuracy >= threshold) {
      matches.push({
        spell,
        accuracy: bestAccuracy,
        matchType
      });
    }
  }
  
  // Sort by accuracy and limit results
  return matches
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, maxResults);
}

// Match or fallback - always returns a spell to cast
export function matchOrFallback(
  transcript: string, 
  opts?: { minScore?: number }
): MatchResult {
  const minScore = opts?.minScore ?? 0.25;
  const matches = findSpellMatches(transcript, 0.1, 1); // Very low threshold to find anything
  
  if (matches.length > 0 && matches[0].accuracy >= minScore) {
    return {
      spell: matches[0].spell,
      score: matches[0].accuracy,
      matched: true
    };
  }
  
  // Return fallback spell
  return {
    spell: ARCANE_BURST,
    score: matches.length > 0 ? matches[0].accuracy : 0.1,
    matched: false
  };
}
// Match or fallback - always returns a spell to cast
export function matchOrFallback(
  transcript: string, 
  opts?: { minScore?: number }
): MatchResult {
  const minScore = opts?.minScore ?? 0.25;
  const matches = findSpellMatches(transcript, 0.1, 1); // Very low threshold to find anything
  
  if (matches.length > 0 && matches[0].accuracy >= minScore) {
    return {
      spell: matches[0].spell,
      score: matches[0].accuracy,
      matched: true
    };
  }
  
  // Return fallback spell
  return {
    spell: ARCANE_BURST,
    score: matches.length > 0 ? matches[0].accuracy : 0.1,
    matched: false
  };
}

// Calculate spell power based on accuracy and loudness
export function calculateSpellPower(
  accuracy: number, 
  loudness: number, 
  normalizedRms: number,
  matched: boolean = true
  matched: boolean = true
): number {
  // New power formula: 60% accuracy + 40% normalized RMS
  let power = Math.min(accuracy * 0.6 + normalizedRms * 0.4, 1.0);
  
  // Reduce power for fallback spells
  if (!matched) {
    power *= 0.6;
  }
  
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, power));
}

// Get element color class for UI
export function getElementColor(element: string): string {
  const colorMap: Record<string, string> = {
    fire: 'text-fire',
    ice: 'text-ice',
    lightning: 'text-lightning',
    nature: 'text-nature',
    shadow: 'text-shadow',
    light: 'text-light',
    arcane: 'text-arcane',
    water: 'text-water',
    wind: 'text-wind',
    earth: 'text-earth'
  };
  
  return colorMap[element] || 'text-foreground';
}

// Get difficulty color class
export function getDifficultyColor(difficulty: string): string {
  const colorMap: Record<string, string> = {
    easy: 'text-nature',
    medium: 'text-light',
    hard: 'text-fire',
    veryhard: 'text-shadow'
  };
  
  return colorMap[difficulty] || 'text-foreground';
}

// Format phonemes for display
export function formatPhonemes(phonemes: string[]): string {
  return phonemes.join(' ').replace(/\s+/g, '-');
}