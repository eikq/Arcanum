import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { VoiceIndicator } from './VoiceIndicator';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { Caster } from './Caster';
import { Projectile } from './Projectile';
import { BattleHUD } from './BattleHUD';
import { CastFeed, type FeedItem } from './CastFeed';
import { EndMatchModal, type EndKind } from './EndMatchModal';
import { CooldownRing } from '@/components/ui/cooldown-ring';
import { MicGauge } from '@/components/ui/mic-gauge';
import { handleFinalTranscript, resetCastHistory, type AutoCasterDeps } from '@/gameplay/AutoCaster';
import { findSpellMatches } from '@/utils/spellMatcher';
import { SPELL_DATABASE } from '@/data/spells';
import { SpellElement } from '@/types/game';
import { soundManager } from '@/audio/SoundManager';
import { createVFXManager } from '@/vfx/VFXManager';
import { createBotOpponent, BotOpponent } from '@/ai/BotOpponent';
import { netClient } from '@/network/NetClient';
import { voiceChat } from '@/network/VoiceChat';
import type { RoomSnapshot, CastPayload } from '@/shared/net';
import { makeServerTimer, canCast, markCast } from '@/shared/net';
import { AudioMeter } from '@/audio/AudioMeter';
import { 
  Volume2, VolumeX, Pause, Play, Settings, 
  Mic, MicOff, Shield, Heart, Zap, 
  Crown, Timer, ArrowLeft 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchProps {
  mode: 'quick' | 'bot' | 'code';
  settings: any;
  onBack: () => void;
  botDifficulty?: 'easy' | 'medium' | 'hard';
  roomId?: string;
}

interface Player {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  isBot?: boolean;
}

export const Match = ({ mode, settings, onBack, botDifficulty = 'medium', roomId }: MatchProps) => {
  // Game state
  const [gameState, setGameState] = useState<'lobby' | 'countdown' | 'playing' | 'finished'>('countdown');
  const [countdown, setCountdown] = useState<number | null>(3);
  const [roundTimer, setRoundTimer] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [endKind, setEndKind] = useState<EndKind>('victory');
  const [showEndModal, setShowEndModal] = useState(false);
  
  // Players
  const [players, setPlayers] = useState<Player[]>([
    { id: 'player1', name: 'You', hp: 100, maxHp: 100, mana: 100, maxMana: 100 },
    { id: 'player2', name: mode === 'bot' ? 'Bot' : 'Opponent', hp: 100, maxHp: 100, mana: 100, maxMana: 100, isBot: mode === 'bot' }
  ]);
  
  // Combat
  const [castHistory, setCastHistory] = useState<FeedItem[]>([]);
  const [lastCastTime, setLastCastTime] = useState(0);
  const [globalCooldown, setGlobalCooldown] = useState(false);
  const [totalDamageDealt, setTotalDamageDealt] = useState(0);
  const [totalDamageTaken, setTotalDamageTaken] = useState(0);
  
  // Voice and audio
  const [isMuted, setIsMuted] = useState(false);
  const [topGuesses, setTopGuesses] = useState<Array<{
    spellId: string;
    name: string;
    score: number;
  }>>([]);
  
  // Casting visuals
  const [activeCasts, setActiveCasts] = useState<{
    player1?: { element: SpellElement; timestamp: number };
    player2?: { element: SpellElement; timestamp: number };
  }>({});
  const [activeProjectiles, setActiveProjectiles] = useState<any[]>([]);
  const projectileIdRef = useRef(0);
  
  // UI
  const [showingDamage, setShowingDamage] = useState<{ amount: number; type: 'damage' | 'heal'; position: { x: number; y: number } } | null>(null);
  const [matchDuration, setMatchDuration] = useState(0);
  
  // Refs
  const vfxCanvasRef = useRef<HTMLCanvasElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const vfxManagerRef = useRef<any>(null);
  const botOpponentRef = useRef<BotOpponent | null>(null);
  const matchStartTimeRef = useRef<number>(0);
  const audioMeterRef = useRef<AudioMeter | null>(null);
  
  // Voice recognition with AutoCaster integration
  const voiceRecognition = useVoiceRecognition({
    onInterim: (transcript: string) => {
      if (!transcript.trim()) {
        setTopGuesses([]);
        return;
      }
      
      // Show live spell guesses
      const matches = findSpellMatches(transcript, 0.2, 3);
      setTopGuesses(matches.map(match => ({
        spellId: match.spell.id,
        name: match.spell.name,
        score: match.accuracy
      })));
    },
    onFinal: (transcript: string) => {
      if (gameState !== 'playing' || isPaused || !transcript.trim()) return;
      
      // Use AutoCaster for consistent casting logic
      const deps: AutoCasterDeps = {
        getRms: () => audioMeterRef.current?.getRms() || 0,
        getMinRms: () => audioMeterRef.current?.getCalibration().minRms || 0.02,
        getCooldownMs: () => 1000,
        hotwordEnabled: () => settings.hotwordEnabled || false,
        hotword: () => settings.hotword || 'arcanum',
        now: () => performance.now(),
        onCast: (payload) => {
          handlePlayerCast(payload);
        },
        onDebug: (msg) => console.log('AutoCaster:', msg)
      };
      
      handleFinalTranscript(transcript, deps, settings.minAccuracy || 0.25, settings.alwaysCast !== false);
    }
  });

  const { isListening, transcript, confidence, loudness, hasPermission, isSupported, interim, final } = voiceRecognition;

  // Initialize systems
  useEffect(() => {
    const initSystems = async () => {
      try {
        // Initialize audio
        await soundManager.init();
        soundManager.setVolumes({
          ui: settings.masterVolume || 0.8,
          sfx: settings.sfxVolume || 0.8,
          music: settings.musicVolume || 0.6
        });
        
        // Initialize audio meter
        const meter = new AudioMeter();
        await meter.start();
        audioMeterRef.current = meter;
        
        // Initialize VFX
        if (vfxCanvasRef.current) {
          vfxManagerRef.current = createVFXManager(vfxCanvasRef.current);
          await vfxManagerRef.current.init();
        }
        
        // Initialize bot opponent for bot mode
        if (mode === 'bot') {
          botOpponentRef.current = createBotOpponent(botDifficulty);
        }
        
        // Start countdown
        startCountdown();
        
      } catch (error) {
        console.error('Failed to initialize match systems:', error);
        toast({
          title: "Initialization Error",
          description: "Some game systems failed to load. Match may not work properly.",
          variant: "destructive",
        });
      }
    };

    initSystems();

    return () => {
      // Cleanup
      if (vfxManagerRef.current) {
        vfxManagerRef.current.destroy();
      }
      if (botOpponentRef.current) {
        botOpponentRef.current.stop();
      }
      if (audioMeterRef.current) {
        audioMeterRef.current.destroy();
      }
      voiceChat.disconnect();
      soundManager.stopMusic();
      resetCastHistory();
    };
  }, []);

  // Start countdown
  const startCountdown = useCallback(() => {
    setGameState('countdown');
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev !== null && prev <= 1) {
          clearInterval(countdownInterval);
          startMatch();
          return null;
        }
        soundManager.playUI('click');
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
  }, []);

  // Start match
  const startMatch = useCallback(async () => {
    setGameState('playing');
    setCountdown(null);
    matchStartTimeRef.current = Date.now();
    
    // Start voice recognition
    try {
      if (!hasPermission) {
        await voiceRecognition.primeMic();
      }
      await voiceRecognition.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
    }
    
    // Start bot opponent
    if (mode === 'bot' && botOpponentRef.current) {
      botOpponentRef.current.start((cast) => {
        handleOpponentCast(cast);
      });
    }
    
    // Start battle music
    soundManager.music.start('battle_theme');
    
    // Start match timer
    const timerInterval = setInterval(() => {
      if (gameState === 'playing' && !isPaused) {
        setMatchDuration(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [hasPermission, mode, gameState, isPaused]);

  // Handle player cast
  const handlePlayerCast = useCallback((payload: {
    spellId: string;
    accuracy: number;
    loudness: number;
    power: number;
    assist?: boolean;
  }) => {
    const spell = SPELL_DATABASE.find(s => s.id === payload.spellId);
    if (!spell) return;
    
    const damage = spell.damage ? Math.floor(spell.damage * payload.power) : 0;
    const healing = spell.healing ? Math.floor(spell.healing * payload.power) : 0;
    
    // Add to cast history
    const feedItem: FeedItem = {
      id: `cast-${Date.now()}`,
      caster: 'you',
      spell: spell.name,
      acc: payload.accuracy,
      power: payload.power,
      deltaHp: damage > 0 ? -damage : healing > 0 ? healing : undefined,
      ts: Date.now(),
      assist: payload.assist
    };
    
    setCastHistory(prev => [...prev, feedItem]);
    
    // Apply effects
    if (damage > 0) {
      dealDamage('player2', damage);
      setTotalDamageDealt(prev => prev + damage);
    }
    if (healing > 0) {
      healPlayer('player1', healing);
    }
    
    // Visual and audio feedback
    setActiveCasts(prev => ({
      ...prev,
      player1: { element: spell.element, timestamp: Date.now() }
    }));
    
    // Clear casting animation after 600ms
    setTimeout(() => {
      setActiveCasts(prev => ({ ...prev, player1: undefined }));
    }, 600);
    
    // Create projectile for damage spells
    if (damage > 0) {
      setTimeout(() => {
        const projectileId = projectileIdRef.current++;
        setActiveProjectiles(prev => [...prev, {
          id: projectileId,
          element: spell.element,
          from: { x: 200, y: 400 },
          to: { x: 600, y: 200 },
          power: payload.power,
          onComplete: () => {
            setActiveProjectiles(prev => prev.filter(p => p.id !== projectileId));
            soundManager.play('impact', spell.element);
          }
        }]);
      }, 400);
    }
    
    // Show damage numbers
    if (damage > 0) {
      setShowingDamage({
        amount: damage,
        type: 'damage',
        position: { x: 600, y: 150 }
      });
      setTimeout(() => setShowingDamage(null), 2000);
    }
    
    // Set cooldown
    setGlobalCooldown(true);
    setTimeout(() => setGlobalCooldown(false), 1000);
    
    // Send to network for multiplayer
    if (mode !== 'bot' && roomId) {
      netClient.sendCast({
        roomId,
        spellId: payload.spellId,
        accuracy: payload.accuracy,
        loudness: payload.loudness,
        power: payload.power,
        ts: Date.now()
      });
    }
  }, [mode, roomId]);

  // Handle opponent cast
  const handleOpponentCast = useCallback((castData: any) => {
    const spell = SPELL_DATABASE.find(s => s.id === castData.spellId);
    if (!spell) return;
    
    const damage = spell.damage ? Math.floor(spell.damage * castData.power) : 0;
    const healing = spell.healing ? Math.floor(spell.healing * castData.power) : 0;
    
    // Add to cast history
    const feedItem: FeedItem = {
      id: `cast-${Date.now()}`,
      caster: 'foe',
      spell: spell.name,
      acc: castData.accuracy,
      power: castData.power,
      deltaHp: damage > 0 ? -damage : healing > 0 ? healing : undefined,
      ts: Date.now(),
      assist: castData.assist
    };
    
    setCastHistory(prev => [...prev, feedItem]);
    
    // Apply effects
    if (damage > 0) {
      dealDamage('player1', damage);
      setTotalDamageTaken(prev => prev + damage);
    }
    if (healing > 0) {
      healPlayer('player2', healing);
    }
    
    // Visual feedback
    setActiveCasts(prev => ({
      ...prev,
      player2: { element: spell.element, timestamp: Date.now() }
    }));
    
    setTimeout(() => {
      setActiveCasts(prev => ({ ...prev, player2: undefined }));
    }, 600);
    
    if (damage > 0) {
      setTimeout(() => {
        const projectileId = projectileIdRef.current++;
        setActiveProjectiles(prev => [...prev, {
          id: projectileId,
          element: spell.element,
          from: { x: 600, y: 200 },
          to: { x: 200, y: 400 },
          power: castData.power,
          onComplete: () => {
            setActiveProjectiles(prev => prev.filter(p => p.id !== projectileId));
            soundManager.play('impact', spell.element);
          }
        }]);
      }, 400);
    }
  }, []);

  // Damage/healing functions
  const dealDamage = useCallback((playerId: string, amount: number) => {
    setPlayers(prev => prev.map(player => {
      if (player.id === playerId) {
        const newHp = Math.max(0, player.hp - amount);
        if (newHp === 0 && gameState === 'playing') {
          // Player defeated
          const isPlayerDefeated = playerId === 'player1';
          setWinner(isPlayerDefeated ? players[1].name : players[0].name);
          setEndKind(isPlayerDefeated ? 'defeat' : 'victory');
          setGameState('finished');
          setShowEndModal(true);
          soundManager.stopMusic();
          
          if (!isPlayerDefeated) {
            soundManager.music.start('victory');
          }
        }
        return { ...player, hp: newHp };
      }
      return player;
    }));
  }, [gameState, players]);

  const healPlayer = useCallback((playerId: string, amount: number) => {
    setPlayers(prev => prev.map(player => {
      if (player.id === playerId) {
        return { ...player, hp: Math.min(player.maxHp, player.hp + amount) };
      }
      return player;
    }));
  }, []);

  // Pause/resume
  const togglePause = useCallback(() => {
    if (gameState !== 'playing') return;
    
    setIsPaused(prev => {
      const newPaused = !prev;
      if (newPaused) {
        voiceRecognition.stop();
        if (botOpponentRef.current) {
          botOpponentRef.current.stop();
        }
      } else {
        if (hasPermission) {
          voiceRecognition.start();
        }
        if (botOpponentRef.current) {
          botOpponentRef.current.start(handleOpponentCast);
        }
      }
      return newPaused;
    });
  }, [gameState, hasPermission, voiceRecognition, handleOpponentCast]);

  // End match handlers
  const handlePlayAgain = useCallback(() => {
    // Reset match state
    setGameState('countdown');
    setPlayers([
      { id: 'player1', name: 'You', hp: 100, maxHp: 100, mana: 100, maxMana: 100 },
      { id: 'player2', name: mode === 'bot' ? 'Bot' : 'Opponent', hp: 100, maxHp: 100, mana: 100, maxMana: 100, isBot: mode === 'bot' }
    ]);
    setCastHistory([]);
    setWinner(null);
    setShowEndModal(false);
    setTotalDamageDealt(0);
    setTotalDamageTaken(0);
    resetCastHistory();
    startCountdown();
  }, [mode, startCountdown]);

  const handleNextBot = useCallback(() => {
    const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
    const currentIndex = difficulties.indexOf(botDifficulty);
    const nextDifficulty = difficulties[Math.min(currentIndex + 1, difficulties.length - 1)];
    
    // Reset with harder bot
    setGameState('countdown');
    setPlayers([
      { id: 'player1', name: 'You', hp: 100, maxHp: 100, mana: 100, maxMana: 100 },
      { id: 'player2', name: `${nextDifficulty.charAt(0).toUpperCase() + nextDifficulty.slice(1)} Bot`, hp: 100, maxHp: 100, mana: 100, maxMana: 100, isBot: true }
    ]);
    setCastHistory([]);
    setWinner(null);
    setShowEndModal(false);
    setTotalDamageDealt(0);
    setTotalDamageTaken(0);
    resetCastHistory();
    
    // Create new bot
    if (botOpponentRef.current) {
      botOpponentRef.current.stop();
    }
    botOpponentRef.current = createBotOpponent(nextDifficulty);
    
    startCountdown();
  }, [botDifficulty, startCountdown]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Escape':
          togglePause();
          break;
        case 'KeyM':
          setIsMuted(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const player1 = players[0];
  const player2 = players[1];

  if (gameState === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl font-bold text-primary mb-4 animate-pulse">
            {countdown || 'FIGHT!'}
          </div>
          <p className="text-xl text-muted-foreground">
            Prepare your voice and spellbook!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 relative overflow-hidden">
      {/* Caster Visuals */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Player 1 (Left) */}
        <div className="absolute bottom-16 left-16">
          <Caster
            position="left"
            element={activeCasts.player1?.element}
            isCasting={!!activeCasts.player1}
            hp={player1.hp}
            maxHp={player1.maxHp}
          />
        </div>
        
        {/* Player 2 (Right) */}
        <div className="absolute top-16 right-16">
          <Caster
            position="right"
            element={activeCasts.player2?.element}
            isCasting={!!activeCasts.player2}
            hp={player2.hp}
            maxHp={player2.maxHp}
          />
        </div>
        
        {/* Active Projectiles */}
        {activeProjectiles.map(projectile => (
          <Projectile
            key={projectile.id}
            element={projectile.element}
            from={projectile.from}
            to={projectile.to}
            power={projectile.power}
            onComplete={projectile.onComplete}
          />
        ))}
      </div>
      
      {/* VFX Canvas */}
      <canvas
        ref={vfxCanvasRef}
        className="absolute inset-0 pointer-events-none z-5"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Remote Audio for Voice Chat */}
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      
      {/* Battle HUD */}
      <BattleHUD
        you={{
          name: player1.name,
          hp: player1.hp,
          mp: player1.mana,
          maxHp: player1.maxHp,
          maxMp: player1.maxMana,
          crown: true
        }}
        foe={{
          name: player2.name,
          hp: player2.hp,
          mp: player2.mana,
          maxHp: player2.maxHp,
          maxMp: player2.maxMana,
          isBot: player2.isBot
        }}
        time={formatTime(matchDuration)}
        onBack={onBack}
        isMuted={isMuted}
        onToggleMute={() => {
          setIsMuted(!isMuted);
          soundManager.setMuted(!isMuted);
        }}
      />

      {/* Bottom HUD - Mic Interface */}
      <div className="fixed bottom-4 left-4 right-4 z-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Mic Gauge */}
            <div className="flex justify-center lg:justify-start">
              <CooldownRing
                isActive={globalCooldown}
                cooldownMs={1000}
                className="inline-block"
              >
                <MicGauge
                  rms={audioMeterRef.current?.getRms() || 0}
                  dbfs={audioMeterRef.current?.getDbfs() || -60}
                  normalizedRms={audioMeterRef.current?.normalizedRms(audioMeterRef.current?.getRms() || 0) || 0}
                  calibration={audioMeterRef.current?.getCalibration()}
                  muted={!isListening}
                />
              </CooldownRing>
            </div>
            
            {/* Voice Status */}
            <div className="bg-card/80 backdrop-blur border rounded-lg p-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  {!hasPermission ? (
                    <span className="text-destructive">Microphone access required</span>
                  ) : isListening ? (
                    <span className="text-nature">Listening...</span>
                  ) : (
                    <span className="text-muted-foreground">Microphone ready</span>
                  )}
                </div>
                
                {interim && (
                  <div className="text-sm text-muted-foreground italic">
                    {interim}
                  </div>
                )}
                
                {final && (
                  <div className="text-sm text-nature font-medium">
                    ✓ {final}
                  </div>
                )}
                
                {topGuesses.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {topGuesses.slice(0, 3).map((guess, idx) => (
                      <span key={guess.spellId} className="text-xs bg-primary/20 px-2 py-1 rounded">
                        {idx + 1}. {guess.name} ({Math.round(guess.score * 100)}%)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Cast Feed */}
            <div className="flex justify-center lg:justify-end">
              <CastFeed items={castHistory} className="w-full max-w-80" />
            </div>
          </div>
        </div>
      </div>

      {/* Damage Numbers */}
      {showingDamage && (
        <div
          className="fixed z-30 pointer-events-none animate-bounce"
          style={{
            left: showingDamage.position.x,
            top: showingDamage.position.y,
          }}
        >
          <div className={cn(
            "text-2xl font-bold",
            showingDamage.type === 'damage' ? "text-red-500" : "text-green-500"
          )}>
            {showingDamage.type === 'damage' ? '-' : '+'}{showingDamage.amount}
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-card p-6 rounded-lg border shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Game Paused</h2>
            <div className="space-y-4">
              <Button onClick={togglePause} className="w-full">
                Resume Match
              </Button>
              <Button onClick={onBack} variant="outline" className="w-full">
                Exit Match
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End Match Modal */}
      <EndMatchModal
        isOpen={showEndModal}
        kind={endKind}
        youDmg={totalDamageDealt}
        foeDmg={totalDamageTaken}
        casts={castHistory}
        onPlayAgain={handlePlayAgain}
        onBackToMenu={onBack}
        onNextBot={mode === 'bot' ? handleNextBot : undefined}
      />
    </div>
  );
};