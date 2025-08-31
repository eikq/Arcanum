// Cast gating logic with detailed reasons

export interface CastGateParams {
  isFinal: boolean;
  rms: number;
  finalTranscript: string;
  now: number;
  lastCastTs: number;
  cooldownMs: number;
  lastTranscript: string;
  minRms: number;
  normalized: number;
  minAccuracy: number;
  alwaysCast: boolean;
  normalized: number;
  minAccuracy: number;
  alwaysCast: boolean;
  hotwordEnabled: boolean;
  hotword: string;
}

export interface CastGateResult {
  ok: boolean;
  reason?: string;
  details?: string;
  assist?: boolean;
  assist?: boolean;
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
    normalized,
    minAccuracy,
    alwaysCast,
    normalized,
    minAccuracy,
    alwaysCast,
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
      reason: "ON_COOLDOWN",
      details: `${Math.ceil(remainingMs)}ms remaining`

  // Check cooldown (always enforced)
  const timeSinceLastCast = now - lastCastTs;
  // Check for duplicate transcript (within 500ms)
  if (finalTranscript && finalTranscript === lastTranscript && timeSinceLastCast < 500) {
    return {
      ok: false,
      reason: "DUPLICATE",
      details: "Same transcript within 500ms"
    };
  }

  // Lenient volume check: pass if raw RMS >= minRms OR normalized >= 0.25
  const volumeOk = rms >= minRms || normalized >= 0.25;
  
  if (!volumeOk && !alwaysCast) {
    return {
      ok: false,
      reason: "LOW_VOLUME",
      details: `RMS ${(rms * 100).toFixed(1)}%, normalized ${(normalized * 100).toFixed(1)}%`
    };
  }

  // Lenient volume check: pass if raw RMS >= minRms OR normalized >= 0.25
  const volumeOk = rms >= minRms || normalized >= 0.25;
  
  if (!volumeOk && !alwaysCast) {
    return {
      ok: false,
      reason: "LOW_VOLUME",
      details: `RMS ${(rms * 100).toFixed(1)}%, normalized ${(normalized * 100).toFixed(1)}%`
    };
  }

  // If volume failed but always-cast is enabled, allow with assist mode
  if (!volumeOk && alwaysCast) {
    return {
      ok: true,
      reason: "ASSIST_MODE",
      details: "Always-cast enabled (reduced power)",
      assist: true
    };
  }

  // If volume failed but always-cast is enabled, allow with assist mode
  if (!volumeOk && alwaysCast) {
    return {
      ok: true,
      reason: "ASSIST_MODE",
      details: "Always-cast enabled (reduced power)",
      assist: true
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