import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { netClient } from '@/network/NetClient';
import { cn } from '@/lib/utils';

interface DiagnosticOverlayProps {
  isVisible: boolean;
  voiceState: {
    isListening: boolean;
    rms: () => number;
  };
  gameState: string;
  cooldownMs?: number;
}

export const DiagnosticOverlay = ({ isVisible, voiceState, gameState, cooldownMs = 1000 }: DiagnosticOverlayProps) => {
  const [fps, setFps] = useState(0);
  const [lastCastTime, setLastCastTime] = useState<number | null>(null);

  // FPS Counter
  useEffect(() => {
    if (!isVisible) return;

    let frameCount = 0;
    let startTime = performance.now();

    const countFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        frameCount = 0;
        startTime = currentTime;
      }
      
      if (isVisible) {
        requestAnimationFrame(countFrame);
      }
    };

    requestAnimationFrame(countFrame);
  }, [isVisible]);

  if (!isVisible) return null;

  const serverOffset = netClient.getServerOffset();
  const connectionState = netClient.isConnected() ? 'Connected' : 'Disconnected';
  const rmsLevel = voiceState.rms() || 0;

  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <Card className="bg-background/90 backdrop-blur border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono">🔧 Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs font-mono">
          {/* Network Status */}
          <div className="flex justify-between">
            <span>Connection:</span>
            <Badge variant={netClient.isConnected() ? 'default' : 'destructive'}>
              {connectionState}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span>Server Offset:</span>
            <span className={cn(
              Math.abs(serverOffset) > 100 ? 'text-warning' : 'text-muted-foreground'
            )}>
              {serverOffset}ms
            </span>
          </div>

          {/* Voice Recognition */}
          <div className="flex justify-between">
            <span>SR State:</span>
            <Badge variant={voiceState.isListening ? 'default' : 'outline'}>
              {voiceState.isListening ? 'Listening' : 'Stopped'}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span>RMS Level:</span>
            <span className={cn(
              rmsLevel >= 0.08 ? 'text-nature' : 'text-muted-foreground'
            )}>
              {(rmsLevel * 100).toFixed(1)}%
            </span>
          </div>

          {/* Game State */}
          <div className="flex justify-between">
            <span>Game State:</span>
            <Badge variant="secondary">{gameState}</Badge>
          </div>

          {/* Performance */}
          <div className="flex justify-between">
            <span>FPS:</span>
            <span className={cn(
              fps >= 55 ? 'text-nature' : fps >= 30 ? 'text-warning' : 'text-destructive'
            )}>
              {fps}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Cooldown:</span>
            <span>{cooldownMs}ms</span>
          </div>

          {/* Memory Usage (if available) */}
          {(performance as any).memory && (
            <div className="flex justify-between">
              <span>Memory:</span>
              <span className="text-muted-foreground">
                {Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};