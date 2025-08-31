// NEW: Live microphone gauge with RMS/dBFS display
import { cn } from '@/lib/utils';
import { Mic, MicOff } from 'lucide-react';

interface MicGaugeProps {
  rms: number;
  dbfs: number;
  muted: boolean;
  threshold?: number;
  className?: string;
}

export const MicGauge = ({ 
  rms, 
  dbfs, 
  muted, 
  threshold = 0.08, 
  className 
}: MicGaugeProps) => {
  // Determine color based on RMS level and threshold
  const getColor = () => {
    if (muted) return 'text-muted-foreground';
    if (rms >= threshold) return 'text-nature';
    if (rms >= threshold * 0.7) return 'text-warning';
    return 'text-destructive';
  };

  // Calculate ring radius based on RMS (20px base + up to 20px growth)
  const ringRadius = 20 + (rms * 20);
  const circumference = 2 * Math.PI * ringRadius;

  return (
    <div className={cn("relative flex flex-col items-center gap-2", className)}>
      {/* Animated Ring */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 80 80"
        >
          {/* Background ring */}
          <circle
            cx="40"
            cy="40"
            r="20"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="2"
            opacity="0.3"
          />
          
          {/* Dynamic ring */}
          {!muted && (
            <circle
              cx="40"
              cy="40"
              r={ringRadius}
              fill="none"
              stroke={`hsl(var(--${rms >= threshold ? 'nature' : 'destructive'}))`}
              strokeWidth="3"
              strokeLinecap="round"
              opacity={0.6 + (rms * 0.4)}
              className="transition-all duration-150"
            />
          )}
        </svg>

        {/* Microphone Icon */}
        <div className={cn("p-2 rounded-full transition-colors", getColor())}>
          {muted ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </div>
      </div>

      {/* Readings */}
      <div className="text-center">
        <div className={cn("text-sm font-mono font-semibold", getColor())}>
          {muted ? '---' : `${(rms * 100).toFixed(0)}%`}
        </div>
        <div className={cn("text-xs font-mono opacity-70", getColor())}>
          {muted ? '--- dBFS' : `${Math.round(dbfs)} dBFS`}
        </div>
      </div>

      {/* Threshold indicator */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-muted" />
        <span>Threshold: {(threshold * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
};