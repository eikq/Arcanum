// Comprehensive diagnostic overlay for mic and casting system
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Mic, Activity, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DiagnosticState {
  // Audio Context
  audioContextState: 'suspended' | 'running' | 'closed';
  sampleRate: number;
  
  // Permissions
  micPermission: 'granted' | 'denied' | 'prompt';
  secureOrigin: boolean;
  
  // Audio Track
  trackEnabled: boolean;
  trackMuted: boolean;
  trackReadyState: 'live' | 'ended';
  
  // Audio Levels
  rms: number;
  dbfs: number;
  
  // Speech Recognition
  srSupported: boolean;
  srListening: boolean;
  srError?: string;
  
  // Transcription
  interim?: string;
  final?: string;
  
  // Top Guesses
  topGuesses: Array<{
    spellId: string;
    name: string;
    score: number;
  }>;
  
  // Cast Gate
  gateFlags: {
    isFinal: boolean;
    rmsOK: boolean;
    cooldownOK: boolean;
    notDuplicate: boolean;
    hotwordOK: boolean;
  };
  
  blockReason?: string;
  blockDetails?: string;
  
  // Network
  connectionState: 'disconnected' | 'connecting' | 'connected';
  serverOffset: number;
  
  // Performance
  fps: number;
}

interface DiagnosticOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  state: DiagnosticState;
  onRetryMic?: () => void;
  className?: string;
}

export const DiagnosticOverlay = ({ 
  isOpen, 
  onClose, 
  state, 
  onRetryMic,
  className 
}: DiagnosticOverlayProps) => {
  const [fps, setFps] = useState(0);

  // FPS counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const countFPS = () => {
      frameCount++;
      const now = performance.now();
      
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      
      if (isOpen) {
        requestAnimationFrame(countFPS);
      }
    };
    
    if (isOpen) {
      requestAnimationFrame(countFPS);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const StatusIcon = ({ ok }: { ok: boolean }) => (
    <div className={cn(
      "w-3 h-3 rounded-full",
      ok ? "bg-nature" : "bg-destructive"
    )} />
  );

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 p-4">
      <Card className={cn("mx-auto mt-8 max-w-4xl max-h-[80vh] overflow-y-auto", className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Microphone & Cast Diagnostics
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Security & Permissions */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Security & Permissions
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Secure Origin</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon ok={state.secureOrigin} />
                    <span className={state.secureOrigin ? "text-nature" : "text-destructive"}>
                      {state.secureOrigin ? "HTTPS/Localhost" : "Not Secure"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Microphone Permission</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon ok={state.micPermission === 'granted'} />
                    <Badge variant={
                      state.micPermission === 'granted' ? 'default' :
                      state.micPermission === 'denied' ? 'destructive' : 'secondary'
                    }>
                      {state.micPermission.toUpperCase()}
                    </Badge>
                    {state.micPermission === 'denied' && onRetryMic && (
                      <Button size="sm" variant="outline" onClick={onRetryMic}>
                        Grant Access
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Context */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">AudioContext</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>State</span>
                  <Badge variant={state.audioContextState === 'running' ? 'default' : 'secondary'}>
                    {state.audioContextState.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sample Rate</span>
                  <span className="font-mono">{state.sampleRate}Hz</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Track */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Audio Track Status</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Enabled</span>
                <StatusIcon ok={state.trackEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <span>Muted</span>
                <StatusIcon ok={!state.trackMuted} />
              </div>
              <div className="flex items-center justify-between">
                <span>Ready State</span>
                <Badge variant={state.trackReadyState === 'live' ? 'default' : 'destructive'}>
                  {state.trackReadyState.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Audio Levels */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Audio Levels</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>RMS Level</span>
                  <span className="font-mono">{(state.rms * 100).toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-nature to-light transition-all duration-150"
                    style={{ width: `${Math.min(state.rms * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>dBFS</span>
                  <span className="font-mono">{Math.round(state.dbfs)} dB</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-destructive via-warning to-nature transition-all duration-150"
                    style={{ width: `${Math.max(0, (state.dbfs + 60) / 60 * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Speech Recognition */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Speech Recognition</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Supported</span>
                <StatusIcon ok={state.srSupported} />
              </div>
              <div className="flex items-center justify-between">
                <span>Listening</span>
                <StatusIcon ok={state.srListening} />
              </div>
            </div>
            {state.srError && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                Error: {state.srError}
              </div>
            )}
          </div>

          {/* Transcription */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Live Transcription</h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">Interim: </span>
                <span className="text-sm text-muted-foreground italic">
                  {state.interim || '(listening...)'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Final: </span>
                <span className="text-sm font-medium text-nature">
                  {state.final ? `✓ ${state.final}` : '(none)'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Spell Guesses */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Top Spell Matches</h3>
            <div className="space-y-1">
              {state.topGuesses.length > 0 ? (
                state.topGuesses.map((guess, idx) => (
                  <div key={guess.spellId} className="flex items-center justify-between text-sm">
                    <span>{idx + 1}. {guess.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(guess.score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground italic">No matches yet</div>
              )}
            </div>
          </div>

          {/* Cast Eligibility */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Cast Eligibility</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(state.gateFlags).map(([key, ok]) => (
                <div key={key} className="flex items-center gap-2">
                  <StatusIcon ok={ok} />
                  <span className="capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
            {state.blockReason && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{state.blockReason}</Badge>
                {state.blockDetails && (
                  <span className="text-sm text-muted-foreground">
                    {state.blockDetails}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Network & Performance */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Network
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Connection</span>
                  <Badge variant={
                    state.connectionState === 'connected' ? 'default' :
                    state.connectionState === 'connecting' ? 'secondary' : 'destructive'
                  }>
                    {state.connectionState.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Server Offset</span>
                  <span className="font-mono">{state.serverOffset}ms</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-sm">Performance</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>FPS</span>
                  <span className={cn(
                    "font-mono",
                    fps >= 50 ? "text-nature" : fps >= 30 ? "text-warning" : "text-destructive"
                  )}>
                    {fps}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};