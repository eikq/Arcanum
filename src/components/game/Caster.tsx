import { useEffect, useRef } from 'react';
import { SpellElement } from '@/types/game';

interface CasterProps {
  position: 'left' | 'right';
  element?: SpellElement;
  isCasting: boolean;
  hp: number;
  maxHp: number;
  className?: string;
}

export const Caster = ({ position, element, isCasting, hp, maxHp, className = '' }: CasterProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Caster silhouette colors based on element
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

    const glowColor = element ? elementColors[element] : '#6366f1';
    const isLeft = position === 'left';

    // Caster figure (simple wizard silhouette)
    ctx.save();
    
    // Base color
    ctx.fillStyle = isCasting ? glowColor : '#1e293b';
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = isCasting ? 4 : 2;
    
    // Glow effect when casting
    if (isCasting) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 20;
    }

    // Head
    ctx.beginPath();
    ctx.arc(isLeft ? 30 : 70, 25, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.rect(isLeft ? 24 : 64, 37, 12, 30);
    ctx.fill();
    ctx.stroke();

    // Arms
    ctx.beginPath();
    ctx.moveTo(isLeft ? 24 : 76, 45);
    ctx.lineTo(isLeft ? 10 : 90, isCasting ? 35 : 50);
    ctx.moveTo(isLeft ? 36 : 64, 45);
    ctx.lineTo(isLeft ? 50 : 50, isCasting ? 35 : 50);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(isLeft ? 30 : 70, 67);
    ctx.lineTo(isLeft ? 25 : 75, 85);
    ctx.moveTo(isLeft ? 30 : 70, 67);
    ctx.lineTo(isLeft ? 35 : 65, 85);
    ctx.stroke();

    // Staff/wand (casting pose)
    if (isCasting) {
      ctx.beginPath();
      ctx.moveTo(isLeft ? 10 : 90, 35);
      ctx.lineTo(isLeft ? 5 : 95, 15);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Magic sparkles at wand tip
      const sparkles = 5;
      for (let i = 0; i < sparkles; i++) {
        const angle = (i / sparkles) * Math.PI * 2;
        const x = (isLeft ? 5 : 95) + Math.cos(angle) * 8;
        const y = 15 + Math.sin(angle) * 8;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = glowColor;
        ctx.fill();
      }
    }

    ctx.restore();
  }, [position, element, isCasting]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={100}
        height={100}
        className="w-24 h-24"
      />
      
      {/* HP Bar */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20">
        <div className="bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-red-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(hp / maxHp) * 100}%` }}
          />
        </div>
        <div className="text-xs text-center text-muted-foreground mt-1">
          {hp}/{maxHp}
        </div>
      </div>
    </div>
  );
};