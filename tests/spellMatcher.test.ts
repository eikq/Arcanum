import { describe, it, expect } from 'vitest';
import { matchOrFallback, calculateSpellPower } from '@/utils/spellMatcher';

describe('matchOrFallback', () => {
  it('should return matched spell when score meets minimum', () => {
    const result = matchOrFallback('stupefy', { minScore: 0.25 });
    
    expect(result.matched).toBe(true);
    expect(result.spell.name).toBe('Stupefy');
    expect(result.score).toBeGreaterThan(0.8);
  });

  it('should return fallback when score is below minimum', () => {
    const result = matchOrFallback('gibberish', { minScore: 0.25 });
    
    expect(result.matched).toBe(false);
    expect(result.spell.name).toBe('Arcane Burst');
    expect(result.score).toBeLessThan(0.25);
  });

  it('should return fallback for empty transcript', () => {
    const result = matchOrFallback('', { minScore: 0.25 });
    
    expect(result.matched).toBe(false);
    expect(result.spell.name).toBe('Arcane Burst');
  });
});

describe('calculateSpellPower', () => {
  it('should reduce power for unmatched spells', () => {
    const matchedPower = calculateSpellPower(0.8, 0.6, 0.5, true);
    const unmatchedPower = calculateSpellPower(0.8, 0.6, 0.5, false);
    
    expect(unmatchedPower).toBeLessThan(matchedPower);
    expect(unmatchedPower).toBe(matchedPower * 0.6);
  });

  it('should use normalized RMS in power calculation', () => {
    const power1 = calculateSpellPower(0.5, 0.3, 0.8, true);
    const power2 = calculateSpellPower(0.5, 0.3, 0.2, true);
    
    expect(power1).toBeGreaterThan(power2);
  });
});