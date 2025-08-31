// NEW: Cast gating logic with detailed reasons

export interface CastGateParams {
  isFinal: boolean;
  rms: number;
  finalTranscript: string;
  now: number;
  lastCastTs: number;
  cooldownMs: number;
  lastTranscript: string;
  minRms: number;
  hotwordEnabled: boolean;
  hotword: string;
}

export interface CastGateResult {
  ok: boolean;
  reason?: string;
  details?: string;
}

export function canCastGate(params: CastGateParams): CastGateResult {
  const {
    isFinal,
    rms,
    finalTranscript,
    now,
    lastCastTs,
    cooldownMs,
    lastTranscript,
    minRms,
    hotwordEnabled,
    hotword
  } = params;

  // Check if we have a final result
  if (!isFinal) {
    return {
      ok: false,
      reason: "NO_FINAL",
      details: "Waiting for complete speech result"
    };
  }

  // Check transcript exists
  if (!finalTranscript || !finalTranscript.trim()) {
    return {
      ok: false,
      reason: "NO_TRANSCRIPT",
      details: "Empty or missing transcript"
    };
  }

  // Check hotword requirement
  if (hotwordEnabled) {
    const transcript = finalTranscript.toLowerCase().replace(/[^\w\s]/g, '');
    const hotwordLower = hotword.toLowerCase();
    
    if (!transcript.startsWith(hotwordLower + " ") && transcript !== hotwordLower) {
      return {
        ok: false,
        reason: "HOTWORD_MISSING",
        details: `Must start with "${hotword}"`
      };
    }
  }

  // Check RMS threshold
  if (rms < minRms) {
    return {
      ok: false,
      reason: "LOW_RMS",
      details: `Volume ${(rms * 100).toFixed(1)}% < ${(minRms * 100).toFixed(1)}%`
    };
  }

  // Check cooldown
  const timeSinceLastCast = now - lastCastTs;
  if (timeSinceLastCast < cooldownMs) {
    const remainingMs = cooldownMs - timeSinceLastCast;
    return {
      ok: false,
      reason: "ON_COOLDOWN",
      details: `${remainingMs}ms remaining`
    };
  }

  // Check for duplicate transcript (within 500ms)
  if (finalTranscript && finalTranscript === lastTranscript && timeSinceLastCast < 500) {
    return {
      ok: false,
      reason: "DUPLICATE",
      details: "Same transcript within 500ms"
    };
  }

  return { ok: true };
}

// Client-side cooldown tracking
let lastCast = 0;

export const canCast = (cooldownMs = 1000): boolean => {
  return performance.now() - lastCast >= cooldownMs;
};

export const markCast = (): void => {
  lastCast = performance.now();
};

export const getRemainingCooldown = (cooldownMs = 1000): number => {
  return Math.max(0, cooldownMs - (performance.now() - lastCast));
};