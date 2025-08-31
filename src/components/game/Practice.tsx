import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, Volume2, Settings } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { VoiceIndicator } from './VoiceIndicator';
import { SpellCard } from './SpellCard';
import { MicGauge } from '@/components/ui/mic-gauge';
import { DiagnosticOverlay, DiagnosticState } from '@/components/ui/diagnostic-overlay';
import { CooldownRing } from '@/components/ui/cooldown-ring';
import { findSpellMatches, calculateSpellPower } from '@/utils/spellMatcher';
import { canCastGate, canCast, markCast, getRemainingCooldown } from '@/utils/castGating';
import { SPELL_DATABASE } from '@/data/spells';
import { Spell, SpellElement, SpellDifficulty } from '@/types/game';
import { useToast } from '@/hooks/use-toast';

interface PracticeProps {
  onBack: () => void;
  isIPSafe: boolean;
}

export const Practice = ({ onBack, isIPSafe }: PracticeProps) => {
  const [selectedElement, setSelectedElement] = useState<SpellElement | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<SpellDifficulty | 'all'>('all');
  const [lastCastResult, setLastCastResult] = useState<{
    spell: Spell;
    accuracy: number;
    power: number;
    timestamp: number;
  } | null>(null);
  const [practiceStats, setPracticeStats] = useState({
    totalCasts: 0,
    averageAccuracy: 0,
    bestAccuracy: 0
  });

  // Enhanced state for live feedback
  const [topGuesses, setTopGuesses] = useState<Array<{
    spellId: string;
    name: string;
    score: number;
  }>>([]);
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastCastTime, setLastCastTime] = useState(0);
  const [cooldownMs] = useState(1000);
  const [minRms] = useState(0.08);
  const [hotwordEnabled] = useState(false);
  const [hotword] = useState('arcanum');
  const [showDebug, setShowDebug] = useState(false);
  const [blockReason, setBlockReason] = useState<string>();
  const [blockDetails, setBlockDetails] = useState<string>();

  const { toast } = useToast();

  // Enhanced interim callback for live spell guesses
  const handleInterim = useCallback((transcript: string) => {
    if (!transcript.trim()) {
      setTopGuesses([]);
      return;
    }

    // Lightweight matching for real-time preview
    const matches = findSpellMatches(transcript, 0.3, 3);
    setTopGuesses(matches.map(match => ({
      spellId: match.spell.id,
      name: match.spell.name,
      score: match.accuracy
    })));
  }, []);

  // Enhanced final callback with cast gating
  const handleFinal = useCallback((transcript: string) => {
    if (!transcript.trim()) return;

    const now = performance.now();
    
    // Apply cast gating
    const gateResult = canCastGate({
      isFinal: true,
      rms: voiceState.loudness,
      finalTranscript: transcript,
      now,
      lastCastTs: lastCastTime,
      cooldownMs,
      lastTranscript,
      minRms,
      hotwordEnabled,
      hotword
    });

    if (!gateResult.ok) {
      setBlockReason(gateResult.reason);
      setBlockDetails(gateResult.details);
      toast({
        title: "Cast Blocked",
        description: gateResult.details || gateResult.reason,
        variant: "destructive"
      });
      return;
    }

    // Clear block reason on success
    setBlockReason(undefined);
    setBlockDetails(undefined);

    // Find best spell match
    const matches = findSpellMatches(transcript, 0.4, 1);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      const power = calculateSpellPower(bestMatch.accuracy, voiceState.loudness);
      
      if (power > 0) {
        setLastCastResult({
          spell: bestMatch.spell,
          accuracy: bestMatch.accuracy,
          power,
          timestamp: now
        });

        // Update stats
        setPracticeStats(prev => ({
          totalCasts: prev.totalCasts + 1,
          averageAccuracy: (prev.averageAccuracy * prev.totalCasts + bestMatch.accuracy) / (prev.totalCasts + 1),
          bestAccuracy: Math.max(prev.bestAccuracy, bestMatch.accuracy)
        }));

        // Mark cast time
        markCast();
        setLastCastTime(now);
        setLastTranscript(transcript);

        toast({
          title: "Spell Cast!",
          description: `${bestMatch.spell.name} - ${Math.round(bestMatch.accuracy * 100)}% accuracy`,
        });
      }
    } else {
      toast({
        title: "No Spell Match",
        description: "Try speaking more clearly or check the spell list",
        variant: "destructive"
      });
    }
  }, [lastCastTime, cooldownMs, lastTranscript, minRms, hotwordEnabled, hotword, toast]);

  // Initialize voice recognition
  const voiceState = useVoiceRecognition(
    undefined, // Legacy onResult - not used with new callbacks
    hotwordEnabled,
    hotword,
    handleInterim,
    handleFinal
  );

  // Auto-start mic detection and SR on mount
  useEffect(() => {
    const initializeMic = async () => {
      try {
        await voiceState.primeMic();
        await voiceState.startListening();
      } catch (error) {
        console.error('Failed to initialize microphone:', error);
      }
    };
    
    initializeMic();
  }, []);

  // Keyboard shortcut for debug panel
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        setShowDebug(!showDebug);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showDebug]);

  // Build debug state
  const debugState: DiagnosticState = {
    audioContextState: 'running',
    sampleRate: 48000,
    micPermission: voiceState.hasPermission ? 'granted' : 'denied',
    secureOrigin: location.protocol === 'https:' || location.hostname === 'localhost',
    trackEnabled: true,
    trackMuted: false,
    trackReadyState: 'live',
    srSupported: voiceState.supported,
    srListening: voiceState.listening,
    srError: voiceState.error,
    rms: voiceState.rms(),
    dbfs: voiceState.dbfs,
    interim: voiceState.interim,
    final: voiceState.final,
    topGuesses: topGuesses.map(g => ({ spellId: g.spellId, name: g.name, score: g.score })),
    gateFlags: {
      isFinal: !!voiceState.final,
      rmsOK: voiceState.rms() >= minRms,
      cooldownOK: canCast(cooldownMs),
      notDuplicate: voiceState.final !== lastTranscript,
      hotwordOK: !hotwordEnabled || (voiceState.final?.toLowerCase().startsWith(hotword.toLowerCase()) ?? false)
    },
    blockReason,
    blockDetails,
    connectionState: 'disconnected',
    serverOffset: 0,
    fps: 60
  };

  // Filter spells based on selection
  const filteredSpells = SPELL_DATABASE.filter(spell => {
    if (selectedElement !== 'all' && spell.element !== selectedElement) return false;
    if (selectedDifficulty !== 'all' && spell.difficulty !== selectedDifficulty) return false;
    return true;
  });

  // Get unique elements and difficulties for filters
  const elements = [...new Set(SPELL_DATABASE.map(s => s.element))];
  const difficulties = [...new Set(SPELL_DATABASE.map(s => s.difficulty))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Spell Practice</h1>
          </div>
        </div>

        {/* Enhanced Voice Interface with live feedback */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Voice Casting Interface
              </CardTitle>
              <Button
                variant="ghost" 
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Debug ({showDebug ? 'On' : 'Off'})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Controls Row */}
            <div className="flex items-start gap-6">
              {/* Mic Gauge */}
              <MicGauge
                rms={voiceState.loudness}
                dbfs={voiceState.dbfs}
                muted={!voiceState.isListening}
                threshold={minRms}
              />
              
              {/* Live Transcript & Guesses */}
              <div className="flex-1 space-y-3">
                {/* Speech Status */}
                <div className="text-sm">
                  {!voiceState.hasPermission ? (
                    <span className="text-destructive">Microphone access required</span>
                  ) : voiceState.isListening ? (
                    <span className="text-nature">Listening...</span>
                  ) : (
                    <span className="text-muted-foreground">Microphone ready</span>
                  )}
                </div>
                
                {/* Interim Transcript */}
                {voiceState.interim && (
                  <div className="sr-live">
                    <div className="text-xs text-muted-foreground mb-1">Interim:</div>
                    <div className="text-sm text-muted-foreground italic">
                      {voiceState.interim}
                    </div>
                  </div>
                )}
                
                {/* Final Transcript */}
                {voiceState.final && (
                  <div className="sr-final">
                    <div className="text-xs text-muted-foreground mb-1">Final:</div>
                    <div className="text-sm text-nature font-medium">
                      ✓ {voiceState.final}
                    </div>
                  </div>
                )}
                
                {/* Top Spell Guesses */}
                {topGuesses.length > 0 && (
                  <div className="sr-guesses">
                    <div className="text-xs text-muted-foreground mb-2">Top Spell Matches:</div>
                    <ol className="space-y-1">
                      {topGuesses.map((guess, idx) => (
                        <li key={guess.spellId} className="flex items-center justify-between text-sm">
                          <span>{idx + 1}. {guess.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {(guess.score * 100).toFixed(0)}%
                          </Badge>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
              
              {/* Cast Cooldown */}
              <div className="flex flex-col items-center gap-2">
                <CooldownRing
                  isActive={getRemainingCooldown(cooldownMs) > 0}
                  cooldownMs={cooldownMs}
                  className="w-16 h-16"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-primary" />
                  </div>
                </CooldownRing>
                <div className="text-xs text-center text-muted-foreground">
                  {getRemainingCooldown(cooldownMs) > 0 
                    ? `${Math.ceil(getRemainingCooldown(cooldownMs) / 1000)}s`
                    : 'Ready'
                  }
                </div>
              </div>
            </div>
            
            {/* Legacy Voice Indicator (for compatibility) */}
            <VoiceIndicator 
              voiceState={voiceState} 
              onToggle={voiceState.toggle}
            />
            
            {/* Last Cast Result */}
            {lastCastResult && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Last Cast Result</h4>
                  <Badge variant={lastCastResult.accuracy > 0.8 ? 'default' : 'outline'}>
                    {Math.round(lastCastResult.accuracy * 100)}% accuracy
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{lastCastResult.spell.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{lastCastResult.spell.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Power: {Math.round(lastCastResult.power * 100)}%
                    </div>
                  </div>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-fire via-light to-nature transition-all duration-500"
                      style={{ width: `${lastCastResult.power * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Diagnostic Overlay */}
      <DiagnosticOverlay
        isOpen={showDebug}
        onClose={() => setShowDebug(false)}
        state={debugState}
        onRetryMic={() => voiceState.primeMic()}
      />

        {/* Practice Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Practice Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{practiceStats.totalCasts}</div>
                <div className="text-sm text-muted-foreground">Total Casts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-nature">
                  {Math.round(practiceStats.averageAccuracy * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Average Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-fire">
                  {Math.round(practiceStats.bestAccuracy * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Best Accuracy</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={selectedElement} onValueChange={(value) => setSelectedElement(value as SpellElement | 'all')}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by element" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Elements</SelectItem>
              {elements.map(element => (
                <SelectItem key={element} value={element}>
                  {element.charAt(0).toUpperCase() + element.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDifficulty} onValueChange={(value) => setSelectedDifficulty(value as SpellDifficulty | 'all')}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              {difficulties.map(difficulty => (
                <SelectItem key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1 text-right text-sm text-muted-foreground">
            Showing {filteredSpells.length} of {SPELL_DATABASE.length} spells
          </div>
        </div>

        {/* Spell Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpells.map(spell => (
            <SpellCard 
              key={spell.id} 
              spell={spell} 
              isIPSafe={isIPSafe}
              className="h-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};