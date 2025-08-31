// Live microphone gauge with RMS/dBFS display
import { cn } from '@/lib/utils';
import { Mic, MicOff } from 'lucide-react';
import type { MeterCalib } from '@/audio/AudioMeter';

interface MicGaugeProps {
  rms: number;
  dbfs: number;
  normalizedRms: number;
  calibration?: MeterCalib;
  muted: boolean;
  className?: string;
}

export const MicGauge = ({ 
  rms, 
  dbfs, 
  normalizedRms,
  calibration,
  muted, 
  className 
}: MicGaugeProps) => {
  const threshold = calibration?.minRms || 0.02;
  
  // Determine color based on RMS level and threshold
  const getColor = () => {
    if (muted) return 'text-muted-foreground';
    if (rms >= threshold) return 'text-nature';
    if (rms >= threshold * 0.7) return 'text-warning';
    return 'text-destructive';
  };

  // Calculate ring radius based on normalized RMS (20px base + up to 20px growth)
  const ringRadius = 20 + (normalizedRms * 20);

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
              stroke={`hsl(var(--${normalizedRms >= 0.25 ? 'nature' : normalizedRms >= 0.15 ? 'warning' : 'destructive'}))`}
              strokeWidth="3"
              strokeLinecap="round"
              opacity={0.6 + (normalizedRms * 0.4)}
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
          {muted ? '---' : `${(normalizedRms * 100).toFixed(0)}%`}
        </div>
        <div className={cn("text-xs font-mono opacity-70", getColor())}>
          {muted ? '--- dBFS' : `${Math.round(dbfs)} dBFS`}
        </div>
      </div>

      {/* Calibration info */}
      {calibration?.calibrated && (
        <div className="text-center text-xs text-muted-foreground">
          <div>Floor: {(calibration.noiseFloor * 100).toFixed(1)}%</div>
          <div>Peak: {(calibration.peakRms * 100).toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
};