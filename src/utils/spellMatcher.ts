import { Spell } from '@/types/game';
import { SPELL_DATABASE } from '@/data/spells';

interface SpellMatch {
  spell: Spell;
  accuracy: number;
  matchType: 'exact' | 'alias' | 'phonetic';
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

// Calculate spell power based on accuracy and loudness
export function calculateSpellPower(
  accuracy: number, 
  loudness: number, 
  minLoudness = 0.08
): number {
  // Ensure minimum loudness threshold
  if (loudness < minLoudness) {
    return 0;
  }
  
  // Power formula: 70% accuracy + 30% loudness
  const power = Math.min(accuracy * 0.7 + loudness * 0.3, 1.0);
  
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