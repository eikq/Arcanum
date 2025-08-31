import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { VoiceIndicator } from './VoiceIndicator';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { Caster } from './Caster';
import { Projectile } from './Projectile';
import { findSpellMatches } from '@/utils/spellMatcher';
import { SPELL_DATABASE } from '@/data/spells';
import { SpellElement } from '@/types/game';
import { soundManager } from '@/audio/SoundManager';
import { createVFXManager } from '@/vfx/VFXManager';
import { createBotOpponent, BotOpponent } from '@/ai/BotOpponent';
import { netClient } from '@/network/NetClient';
import { voiceChat } from '@/network/VoiceChat';
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

interface CastHistory {
  spellName: string;
  accuracy: number;
  power: number;
  damage?: number;
  healing?: number;
  timestamp: number;
  playerId: string;
}

export const Match = ({ mode, settings, onBack, botDifficulty = 'medium', roomId }: MatchProps) => {
  // Game state
  const [gameState, setGameState] = useState<'countdown' | 'active' | 'paused' | 'ended'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  
  // Players
  const [players, setPlayers] = useState<Player[]>([
    { id: 'player1', name: 'You', hp: 100, maxHp: 100, mana: 100, maxMana: 100 },
    { id: 'player2', name: mode === 'bot' ? 'Bot' : 'Opponent', hp: 100, maxHp: 100, mana: 100, maxMana: 100, isBot: mode === 'bot' }
  ]);
  
  // Combat
  const [castHistory, setCastHistory] = useState<CastHistory[]>([]);
  const [lastCastTime, setLastCastTime] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [globalCooldown, setGlobalCooldown] = useState(false);
  const [spellCooldowns, setSpellCooldowns] = useState<Map<string, number>>(new Map());
  
  // Voice and audio
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceChatMuted, setIsVoiceChatMuted] = useState(true);
  
  // NEW: Casting visuals
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
  
  // Voice recognition
  const voiceRecognition = useVoiceRecognition((transcript, confidence, loudness) => {
    if (gameState !== 'active' || isPaused || !transcript.trim()) return;
    
    const matches = findSpellMatches(transcript, settings.sensitivity || 0.6);
    if (matches.length > 0 && confidence > 0.5) {
      const match = matches[0];
      const power = Math.min(1.0, match.accuracy * 0.7 + loudness * 0.3);
      handleCast(match.spell.id, match.accuracy, loudness, power);
    }
  });
  
  const { isListening, transcript, confidence, loudness, hasPermission, isSupported } = voiceRecognition;

  // FIX: Auto-start voice recognition on match start
  useEffect(() => {
    if (gameState === 'active' && voiceRecognition.autoStartListening) {
      voiceRecognition.autoStartListening();
    }
  }, [gameState, voiceRecognition.autoStartListening]);

  // Initialize systems
  useEffect(() => {
    const initSystems = async () => {
      try {
        // Initialize audio
        await soundManager.init();
        soundManager.setMasterVolume(settings.masterVolume || 0.8);
        soundManager.setSFXVolume(settings.sfxVolume || 0.8);
        soundManager.setMusicVolume(settings.musicVolume || 0.6);
        
        // Initialize VFX
        if (vfxCanvasRef.current) {
          vfxManagerRef.current = createVFXManager(vfxCanvasRef.current);
          await vfxManagerRef.current.init();
        }
        
        // Initialize bot opponent for bot mode
        if (mode === 'bot') {
          botOpponentRef.current = createBotOpponent(botDifficulty);
        }
        
        // Initialize voice chat for multiplayer
        if (mode !== 'bot' && remoteAudioRef.current) {
          const success = await voiceChat.init(remoteAudioRef.current);
          if (success) {
            await voiceChat.call();
          }
        }
        
        // Start match countdown
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
      voiceChat.disconnect();
      soundManager.stopMusic();
    };
  }, []);

  // Start countdown
  const startCountdown = useCallback(() => {
    setGameState('countdown');
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startMatch();
          return 0;
        }
        soundManager.playUI('click');
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Start match
  const startMatch = useCallback(() => {
    setGameState('active');
    matchStartTimeRef.current = Date.now();
    
    // Voice recognition starts automatically
    
    // Start bot opponent
    if (mode === 'bot' && botOpponentRef.current) {
      botOpponentRef.current.start((cast) => {
        handleOpponentCast(cast);
      });
    }
    
    // Start battle music
    soundManager.playMusic('match_intense');
    
    // Start match timer
    const timerInterval = setInterval(() => {
      if (gameState === 'active' && !isPaused) {
        setMatchDuration(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [hasPermission, isSupported, mode, gameState, isPaused]);

  // Handle spell casting
  const handleCast = useCallback((spellId: string, accuracy: number, loudness: number, power: number) => {
    const now = performance.now();
    
    // Check global cooldown
    if (globalCooldown) {
      return;
    }
    
    // Check spell-specific cooldown
    const spellLastCast = spellCooldowns.get(spellId) || 0;
    const spell = SPELL_DATABASE.find(s => s.id === spellId);
    const spellCooldown = spell?.cooldown || 1500;
    
    if (now - spellLastCast < spellCooldown) {
      return;
    }
    
    // Perform cast
    const castData = {
      spellName: spell?.name || 'Unknown Spell',
      accuracy,
      power,
      damage: spell?.damage ? Math.floor(spell.damage * power) : 0,
      healing: spell?.healing ? Math.floor(spell.healing * power) : 0,
      timestamp: now,
      playerId: 'player1'
    };
    
    // Update cooldowns
    setGlobalCooldown(true);
    setTimeout(() => setGlobalCooldown(false), 1000);
    
    setSpellCooldowns(prev => new Map(prev.set(spellId, now)));
    
    // Add to cast history
    setCastHistory(prev => [...prev, castData]);
    
    // Apply effects
    if (castData.damage > 0) {
      dealDamage('player2', castData.damage);
    }
    if (castData.healing > 0) {
      healPlayer('player1', castData.healing);
    }
    
    // NEW: Visual and audio feedback with caster visuals
    if (spell) {
      soundManager.playCast(spell.element, loudness);
      
      // Show casting animation
      setActiveCasts(prev => ({
        ...prev,
        player1: { element: spell.element, timestamp: now }
      }));
      
      // Clear casting animation after 600ms
      setTimeout(() => {
        setActiveCasts(prev => ({ ...prev, player1: undefined }));
      }, 600);
      
      // Create projectile for damage spells
      if (castData.damage > 0) {
        setTimeout(() => {
          const projectileId = projectileIdRef.current++;
          setActiveProjectiles(prev => [...prev, {
            id: projectileId,
            element: spell.element,
            from: { x: 200, y: 400 },
            to: { x: 600, y: 200 },
            power,
            onComplete: () => {
              setActiveProjectiles(prev => prev.filter(p => p.id !== projectileId));
              // Screen shake and impact sound
              soundManager.playImpact(spell.element);
            }
          }]);
        }, 400);
      }
    }
    
    // Update combo
    const timeSinceLastCast = now - lastCastTime;
    if (timeSinceLastCast < 2500) {
      setComboCount(prev => prev + 1);
    } else {
      setComboCount(1);
    }
    setLastCastTime(now);
    
    // Show damage numbers
    if (castData.damage > 0) {
      setShowingDamage({
        amount: castData.damage,
        type: 'damage',
        position: { x: 600, y: 150 }
      });
      setTimeout(() => setShowingDamage(null), 2000);
    }
    
    // Send to network (multiplayer)
    if (mode !== 'bot') {
      netClient.sendCast({
        roomId: roomId || '',
        spellId,
        accuracy,
        loudness,
        power,
        ts: now
      });
    }
    
  }, [globalCooldown, spellCooldowns, lastCastTime, mode, roomId]);

  // Handle opponent cast
  const handleOpponentCast = useCallback((castData: any) => {
    const spell = SPELL_DATABASE.find(s => s.id === castData.spellId);
    if (!spell) return;
    
    const damage = spell.damage ? Math.floor(spell.damage * castData.power) : 0;
    const healing = spell.healing ? Math.floor(spell.healing * castData.power) : 0;
    
    // Add to cast history
    setCastHistory(prev => [...prev, {
      spellName: spell.name,
      accuracy: castData.accuracy,
      power: castData.power,
      damage,
      healing,
      timestamp: castData.ts,
      playerId: castData.isBot ? 'player2' : 'opponent'
    }]);
    
    // Apply effects
    if (damage > 0) {
      dealDamage('player1', damage);
    }
    if (healing > 0) {
      healPlayer('player2', healing);
    }
    
    // NEW: Audio and visual feedback for opponent
    soundManager.playCast(spell.element, castData.loudness || 0.8);
    
    // Show opponent casting animation
    setActiveCasts(prev => ({
      ...prev,
      player2: { element: spell.element, timestamp: castData.ts }
    }));
    
    // Clear casting animation after 600ms
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
            soundManager.playImpact(spell.element);
          }
        }]);
      }, 400);
    }
    
    // Show damage numbers
    if (damage > 0) {
      setShowingDamage({
        amount: damage,
        type: 'damage',
        position: { x: 200, y: 350 }
      });
      setTimeout(() => setShowingDamage(null), 2000);
    }
  }, []);

  // Voice recognition handled in callback above

  // Damage/healing functions
  const dealDamage = useCallback((playerId: string, amount: number) => {
    setPlayers(prev => prev.map(player => {
      if (player.id === playerId) {
        const newHp = Math.max(0, player.hp - amount);
        if (newHp === 0 && gameState === 'active') {
          // Player defeated
          const winnerId = playerId === 'player1' ? 'player2' : 'player1';
          const winnerName = players.find(p => p.id === winnerId)?.name || 'Unknown';
          setWinner(winnerName);
          setGameState('ended');
          soundManager.stopMusic();
          
          if (winnerId === 'player1') {
            soundManager.playMusic('victory');
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
    if (gameState !== 'active') return;
    
    setIsPaused(prev => {
      const newPaused = !prev;
      if (newPaused) {
        voiceRecognition.stopListening();
        if (botOpponentRef.current) {
          botOpponentRef.current.stop();
        }
      } else {
        if (hasPermission) {
          voiceRecognition.startListening();
        }
        if (botOpponentRef.current) {
          botOpponentRef.current.start(handleOpponentCast);
        }
      }
      return newPaused;
    });
  }, [gameState, hasPermission, voiceRecognition.startListening, voiceRecognition.stopListening, handleOpponentCast]);

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
      {/* NEW: Caster Visuals */}
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
      
      {/* Top HUD */}
      <div className="relative z-20 p-4">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-sm">
              <Timer className="w-4 h-4 mr-1" />
              {formatTime(matchDuration)}
            </Badge>
            
            {comboCount > 1 && (
              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse">
                {comboCount}x COMBO!
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
              className="text-muted-foreground"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            
            {mode !== 'bot' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVoiceChatMuted(!isVoiceChatMuted)}
                className="text-muted-foreground"
              >
                {isVoiceChatMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePause}
              className="text-muted-foreground"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Player Status */}
        <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Player 1 (You) */}
          <Card className="bg-background/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{player1.name}</h3>
                <Crown className="w-5 h-5 text-yellow-500" />
              </div>
              
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center">
                      <Heart className="w-4 h-4 mr-1 text-red-500" />
                      Health
                    </span>
                    <span>{player1.hp}/{player1.maxHp}</span>
                  </div>
                  <Progress value={(player1.hp / player1.maxHp) * 100} className="h-3" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center">
                      <Zap className="w-4 h-4 mr-1 text-blue-500" />
                      Mana
                    </span>
                    <span>{player1.mana}/{player1.maxMana}</span>
                  </div>
                  <Progress value={(player1.mana / player1.maxMana) * 100} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Player 2 (Opponent/Bot) */}
          <Card className="bg-background/80 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{player2.name}</h3>
                {player2.isBot && <Badge variant="secondary">Bot</Badge>}
              </div>
              
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center">
                      <Heart className="w-4 h-4 mr-1 text-red-500" />
                      Health
                    </span>
                    <span>{player2.hp}/{player2.maxHp}</span>
                  </div>
                  <Progress value={(player2.hp / player2.maxHp) * 100} className="h-3" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center">
                      <Zap className="w-4 h-4 mr-1 text-blue-500" />
                      Mana
                    </span>
                    <span>{player2.mana}/{player2.maxMana}</span>
                  </div>
                  <Progress value={(player2.mana / player2.maxMana) * 100} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Voice Indicator */}
      <div className="fixed bottom-4 left-4 z-20">
        <VoiceIndicator
          voiceState={{
            isListening,
            isSupported,
            hasPermission,
            transcript,
            confidence,
            loudness
          }}
          onToggle={voiceRecognition.toggle}
        />
      </div>

      {/* Cast History */}
      <div className="fixed bottom-4 right-4 z-20 w-80">
        <Card className="bg-background/90 backdrop-blur max-h-60 overflow-y-auto">
          <CardContent className="p-3">
            <h4 className="font-semibold mb-2 text-sm">Recent Casts</h4>
            <div className="space-y-1 text-xs">
              {castHistory.slice(-5).reverse().map((cast, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex justify-between items-center p-2 rounded",
                    cast.playerId === 'player1' ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"
                  )}
                >
                  <span className="font-medium">{cast.spellName}</span>
                  <div className="flex items-center space-x-1">
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(cast.accuracy * 100)}%
                    </Badge>
                    {cast.damage > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        -{cast.damage}
                      </Badge>
                    )}
                    {cast.healing > 0 && (
                      <Badge className="bg-green-500 text-xs">
                        +{cast.healing}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <h2 className="text-2xl font-bold mb-4">Game Paused</h2>
              <div className="space-y-4">
                <Button onClick={togglePause} className="w-full">
                  Resume Match
                </Button>
                <Button onClick={onBack} variant="outline" className="w-full">
                  Exit Match
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Game End Overlay */}
      {gameState === 'ended' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                {winner === 'You' ? '🎉 Victory!' : '💀 Defeat'}
              </h2>
              <p className="text-xl mb-6">
                {winner === 'You' ? 'Congratulations, wizard!' : `${winner} has won the match`}
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold mb-2">Match Statistics</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{formatTime(matchDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Spells Cast:</span>
                    <span>{castHistory.filter(c => c.playerId === 'player1').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Combo:</span>
                    <span>{comboCount}x</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button onClick={onBack} className="w-full">
                  Return to Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};