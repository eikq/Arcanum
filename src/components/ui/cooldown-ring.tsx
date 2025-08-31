import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CooldownRingProps {
  isActive: boolean;
  cooldownMs: number;
  onCooldownComplete?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const CooldownRing = ({ isActive, cooldownMs, onCooldownComplete, children, className }: CooldownRingProps) => {
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setStartTime(null);
      return;
    }

    const start = performance.now();
    setStartTime(start);
    
    const updateProgress = () => {
      const now = performance.now();
      const elapsed = now - start;
      const newProgress = Math.min(elapsed / cooldownMs, 1);
      
      setProgress(newProgress);
      
      if (newProgress < 1) {
        requestAnimationFrame(updateProgress);
      } else {
        onCooldownComplete?.();
      }
    };
    
    updateProgress();
  }, [isActive, cooldownMs, onCooldownComplete]);

  const circumference = 2 * Math.PI * 20; // radius = 20
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <div className={cn("relative inline-block", className)}>
      {children}
      
      {isActive && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 44 44"
        >
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="2"
          />
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-100 ease-linear"
          />
        </svg>
      )}
      
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-mono text-primary">
            {Math.ceil((1 - progress) * cooldownMs / 1000)}
          </span>
        </div>
      )}
    </div>
  );
};