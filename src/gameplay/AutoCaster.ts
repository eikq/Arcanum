import { bestOrFallback } from "@/engine/recognition/SpellRescorer";
import { calculateSpellPower } from "@/utils/spellMatcher";
import { SPELL_DATABASE } from "@/data/spells";
import { canCastGate } from "@/utils/castGating";
import { soundManager } from "@/audio/SoundManager";

export type AutoCasterDeps = {
  getRms: () => number;
  getMinRms: () => number;      // dynamic from meter or settings
  getCooldownMs: () => number;  // ≥1000ms
  hotwordEnabled: () => boolean;
  hotword: () => string;
  now: () => number;
  onCast: (payload: {
    spellId: string; 
    accuracy: number; 
    loudness: number; 
    power: number; 
    assist?: boolean;
  }) => void;
  onDebug?: (msg: string) => void;
};

let lastCastTs = 0;
let lastTranscript = "";

export function handleFinalTranscript(
  finalText: string, 
  deps: AutoCasterDeps, 
  minAcc = 0.25,
  alwaysCast = true
) {
  const rms = deps.getRms();
  const minRms = deps.getMinRms();
  const now = deps.now();

  const { entry, score, matched } = bestOrFallback(finalText, minAcc);
  const spell = SPELL_DATABASE.find(s => s.id === entry.id) || SPELL_DATABASE[0];
  const normalizedRms = Math.max(0, Math.min(1, (rms - 0.01) / 0.08)); // Simple normalization
  const power = calculateSpellPower(score, rms, normalizedRms, matched);

  const gate = canCastGate({
    isFinal: true,
    rms,
    finalTranscript: finalText,
    now,
    lastCastTs,
    cooldownMs: deps.getCooldownMs(),
    lastTranscript,
    minRms,
    normalized: normalizedRms,
    minAccuracy: minAcc,
    alwaysCast,
    hotwordEnabled: deps.hotwordEnabled(),
    hotword: deps.hotword()
  });

  if (gate.ok) {
    deps.onCast({ 
      spellId: spell.id, 
      accuracy: score, 
      loudness: rms, 
      power, 
      assist: gate.assist || !matched 
    });
    
    soundManager.playCast(spell.element, rms);
    lastCastTs = now;
    lastTranscript = finalText;
    
    return { cast: true, spell, accuracy: score, power, assist: gate.assist || !matched };
  }

  deps.onDebug?.(`gate:${gate.reason} - ${gate.details || ''}`);
  return { cast: false, reason: gate.reason, details: gate.details };
}

export function resetCastHistory() {
  lastCastTs = 0;
  lastTranscript = "";
}