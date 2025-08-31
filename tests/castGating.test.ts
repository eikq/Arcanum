import { describe, it, expect } from 'vitest';
import { canCastGate } from '@/utils/castGating';

describe('canCastGate', () => {
  const baseParams = {
    isFinal: true,
    rms: 0.05,
    finalTranscript: 'stupefy',
    now: 1000,
    lastCastTs: 0,
    cooldownMs: 1000,
    lastTranscript: '',
    minRms: 0.03,
    normalized: 0.4,
    minAccuracy: 0.25,
    alwaysCast: true,
    hotwordEnabled: false,
    hotword: 'arcanum'
  };

  it('should pass when normalized RMS is above 0.25 even if raw RMS is below minRms', () => {
    const result = canCastGate({
      ...baseParams,
      rms: 0.02, // Below minRms
      normalized: 0.3 // Above 0.25
    });
    
    expect(result.ok).toBe(true);
  });

  it('should use assist mode when volume fails but alwaysCast is enabled', () => {
    const result = canCastGate({
      ...baseParams,
      rms: 0.01, // Below minRms
      normalized: 0.1, // Below 0.25
      alwaysCast: true
    });
    
    expect(result.ok).toBe(true);
    expect(result.assist).toBe(true);
    expect(result.reason).toBe('ASSIST_MODE');
  });

  it('should block when volume fails and alwaysCast is disabled', () => {
    const result = canCastGate({
      ...baseParams,
      rms: 0.01,
      normalized: 0.1,
      alwaysCast: false
    });
    
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('LOW_VOLUME');
  });

  it('should enforce cooldown regardless of other settings', () => {
    const result = canCastGate({
      ...baseParams,
      now: 500, // Within cooldown
      lastCastTs: 0,
      cooldownMs: 1000
    });
    
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('ON_COOLDOWN');
  });
});