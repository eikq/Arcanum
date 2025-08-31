import { useEffect, useRef } from 'react';
import { SpellElement } from '@/types/game';

interface ProjectileProps {
  element: SpellElement;
  from: { x: number; y: number };
  to: { x: number; y: number };
  power: number;
  onComplete?: () => void;
  duration?: number;
}

export const Projectile = ({ 
  element, 
  from, 
  to, 
  power, 
  onComplete, 
  duration = 800 
}: ProjectileProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const elementColors: Record<SpellElement, string> = {
      fire: '#ff6b35',
      ice: '#4fc3f7',
      lightning: '#ffeb3b',
      nature: '#4caf50',
      shadow: '#673ab7',
      light: '#ffc107',
      arcane: '#e91e63',
      water: '#2196f3',
      wind: '#9e9e9e',
      earth: '#795548'
    };

    const color = elementColors[element];

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (progress < 1) {
        // Bezier curve for arc trajectory
        const midY = Math.min(from.y, to.y) - 50;
        const t = progress;
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * ((from.x + to.x) / 2) + t * t * to.x;
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * midY + t * t * to.y;

        // Draw projectile
        ctx.save();
        ctx.globalAlpha = 1 - progress * 0.2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15 * power;

        // Main projectile
        ctx.beginPath();
        ctx.arc(x, y, 6 * power + 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Trail effect
        const trailLength = 8;
        for (let i = 1; i <= trailLength; i++) {
          const trailT = Math.max(0, progress - (i * 0.02));
          if (trailT <= 0) break;

          const trailX = (1 - trailT) * (1 - trailT) * from.x + 2 * (1 - trailT) * trailT * ((from.x + to.x) / 2) + trailT * trailT * to.x;
          const trailY = (1 - trailT) * (1 - trailT) * from.y + 2 * (1 - trailT) * trailT * midY + trailT * trailT * to.y;

          ctx.globalAlpha = (1 - progress * 0.2) * (1 - i / trailLength) * 0.7;
          ctx.beginPath();
          ctx.arc(trailX, trailY, (6 * power + 2) * (1 - i / trailLength), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Impact effect
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.shadowColor = color;
        ctx.shadowBlur = 30;

        const burstSize = 20 * power;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const x = to.x + Math.cos(angle) * burstSize;
          const y = to.y + Math.sin(angle) * burstSize;
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }

        ctx.restore();

        // Call completion callback after a brief delay
        setTimeout(() => {
          onComplete?.();
        }, 200);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [element, from, to, power, duration, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="absolute inset-0 pointer-events-none z-20"
      style={{ width: '100%', height: '100%' }}
    />
  );
};