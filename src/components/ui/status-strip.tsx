import { AlertCircle, Mic, MicOff, Volume2, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusStripProps {
  micStatus: 'listening' | 'denied' | 'restarting' | 'disabled';
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  rmsLevel?: number;
  className?: string;
}

export const StatusStrip = ({ micStatus, connectionStatus, rmsLevel = 0, className }: StatusStripProps) => {
  return (
    <div className={cn("flex items-center gap-3 p-2 bg-card/50 backdrop-blur border rounded-lg", className)}>
      {/* Microphone Status */}
      <div className="flex items-center gap-2">
        {micStatus === 'listening' ? (
          <Mic className="w-4 h-4 text-nature animate-pulse" />
        ) : micStatus === 'denied' ? (
          <MicOff className="w-4 h-4 text-destructive" />
        ) : micStatus === 'restarting' ? (
          <AlertCircle className="w-4 h-4 text-warning animate-spin" />
        ) : (
          <MicOff className="w-4 h-4 text-muted-foreground" />
        )}
        
        <Badge variant={
          micStatus === 'listening' ? 'default' :
          micStatus === 'denied' ? 'destructive' :
          micStatus === 'restarting' ? 'secondary' : 'outline'
        }>
          {micStatus === 'listening' ? 'Listening' :
           micStatus === 'denied' ? 'Mic Blocked' :
           micStatus === 'restarting' ? 'Restarting SR' : 'Disabled'}
        </Badge>
        
        {/* RMS Visualizer */}
        {micStatus === 'listening' && (
          <div className="flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-muted-foreground" />
            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-nature via-light to-fire transition-all duration-150"
                style={{ width: `${Math.min(rmsLevel * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {connectionStatus === 'connected' ? (
          <Wifi className="w-4 h-4 text-nature" />
        ) : connectionStatus === 'connecting' ? (
          <Wifi className="w-4 h-4 text-warning animate-pulse" />
        ) : (
          <WifiOff className="w-4 h-4 text-destructive" />
        )}
        
        <Badge variant={
          connectionStatus === 'connected' ? 'default' :
          connectionStatus === 'connecting' ? 'secondary' : 'destructive'
        }>
          {connectionStatus === 'connected' ? 'Online' :
           connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
        </Badge>
      </div>
    </div>
  );
};