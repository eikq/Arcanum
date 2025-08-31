// NEW: Lobby component for ready/mic check states
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { VoiceIndicator } from './VoiceIndicator';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { netClient } from '@/network/NetClient';
import { voiceChat } from '@/network/VoiceChat';
import type { RoomSnapshot } from '@/shared/net';
import { makeServerTimer } from '@/shared/net';
import { 
  Mic, MicOff, Users, Clock, Copy, 
  CheckCircle, XCircle, ArrowLeft 
} from 'lucide-react';

interface LobbyProps {
  roomId: string;
  onBack: () => void;
  onMatchStart: () => void;
}

export const Lobby = ({ roomId, onBack, onMatchStart }: LobbyProps) => {
  const [roomSnapshot, setRoomSnapshot] = useState<RoomSnapshot | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // FIX: Voice recognition for mic test
  const voiceRecognition = useVoiceRecognition(() => {}, false);
  const { hasPermission, isListening, loudness } = voiceRecognition;

  // Handle room updates
  useEffect(() => {
    const handleRoomUpdate = (snapshot: RoomSnapshot) => {
      setRoomSnapshot(snapshot);
      
      // Handle countdown state
      if (snapshot.state === 'countdown' && snapshot.countdownEndsAt) {
        const getTimer = makeServerTimer(snapshot.countdownEndsAt, () => netClient.getServerOffset());
        const updateCountdown = () => {
          const remaining = Math.ceil(getTimer() / 1000);
          setCountdown(remaining);
          
          if (remaining <= 0) {
            onMatchStart();
          } else {
            setTimeout(updateCountdown, 100);
          }
        };
        updateCountdown();
      }
    };

    netClient.on('room_updated', handleRoomUpdate);
    return () => netClient.off('room_updated', handleRoomUpdate);
  }, [onMatchStart]);

  // FIX: Auto mic check on mount
  useEffect(() => {
    const initMicCheck = async () => {
      try {
        await voiceRecognition.autoStartListening?.();
        setMicReady(hasPermission);
      } catch (error) {
        console.warn('Mic check failed:', error);
        setMicReady(false);
      }
    };

    initMicCheck();
  }, [voiceRecognition.autoStartListening, hasPermission]);

  // Update ready state when mic ready changes
  useEffect(() => {
    netClient.setReady(isReady, micReady);
  }, [isReady, micReady]);

  const handleCopyRoomCode = useCallback(() => {
    if (roomSnapshot?.id) {
      navigator.clipboard.writeText(roomSnapshot.id);
      setCopied(true);
      toast({
        title: "Room Code Copied",
        description: "Share this code with your friend!",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  }, [roomSnapshot?.id]);

  const handleRetryMic = useCallback(async () => {
    try {
      await voiceRecognition.autoStartListening?.();
      setMicReady(hasPermission);
    } catch (error) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to continue.",
        variant: "destructive",
      });
    }
  }, [voiceRecognition.autoStartListening, hasPermission]);

  const handleToggleReady = useCallback(() => {
    if (!micReady) {
      toast({
        title: "Microphone Required",
        description: "Please allow microphone access first.",
        variant: "destructive",
      });
      return;
    }
    setIsReady(prev => !prev);
  }, [micReady]);

  const currentPlayer = roomSnapshot?.players.find(p => p.id === netClient.currentRoom);
  const otherPlayer = roomSnapshot?.players.find(p => p.id !== netClient.currentRoom);
  const allReady = roomSnapshot?.players.every(p => p.ready) ?? false;

  if (countdown !== null) {
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
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Menu
          </Button>
          
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Spell Battle Lobby
          </h1>
          
          {roomSnapshot?.id && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-lg text-muted-foreground">Room Code:</span>
              <code className="text-xl font-mono bg-muted px-3 py-1 rounded">
                {roomSnapshot.id}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyRoomCode}
                className="ml-2"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Current Player */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                You ({currentPlayer?.nick || 'Player'})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mic Check */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Microphone</span>
                <div className="flex items-center gap-2">
                  {micReady ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <div 
                          className="w-2 h-2 rounded-full bg-primary transition-all duration-150"
                          style={{ 
                            transform: `scale(${1 + loudness * 2})`,
                            opacity: isListening ? 0.8 + loudness * 0.2 : 0.3
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <Button variant="outline" size="sm" onClick={handleRetryMic}>
                        Retry
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Ready Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ready to Fight</span>
                <Button
                  variant={isReady ? "default" : "outline"}
                  onClick={handleToggleReady}
                  disabled={!micReady}
                >
                  {isReady ? 'Ready!' : 'Not Ready'}
                </Button>
              </div>

              <Badge variant={isReady ? "default" : "secondary"} className="w-full justify-center">
                {isReady ? 'Ready for Battle' : 'Preparing...'}
              </Badge>
            </CardContent>
          </Card>

          {/* Other Player */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {otherPlayer ? `${otherPlayer.nick || 'Opponent'}` : 'Waiting for opponent...'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {otherPlayer ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Microphone</span>
                    {otherPlayer.micReady ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Ready Status</span>
                    {otherPlayer.ready ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>

                  <Badge variant={otherPlayer.ready ? "default" : "secondary"} className="w-full justify-center">
                    {otherPlayer.ready ? 'Ready for Battle' : 'Preparing...'}
                  </Badge>
                </>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Share the room code to invite a friend!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Match Start Indicator */}
        {allReady && (
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="text-center py-6">
              <div className="text-2xl font-bold text-primary mb-2">
                All Players Ready!
              </div>
              <p className="text-muted-foreground">
                Match will begin in a moment...
              </p>
              <div className="mt-4">
                <Progress value={100} className="w-full max-w-xs mx-auto" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
