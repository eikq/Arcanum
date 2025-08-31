import { Spell } from '@/types/game';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getElementColor, getDifficultyColor } from '@/utils/spellMatcher';
import { IP_SAFE_NAMES } from '@/data/spells';

interface SpellCardProps {
  spell: Spell;
  accuracy?: number;
  matchType?: 'exact' | 'alias' | 'phonetic';
  isIPSafe?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SpellCard = ({ 
  spell, 
  accuracy, 
  matchType, 
  isIPSafe = false, 
  onClick, 
  className = '' 
}: SpellCardProps) => {
  const displayName = isIPSafe ? IP_SAFE_NAMES[spell.id] || spell.name : spell.name;
  const elementColor = getElementColor(spell.element);
  const difficultyColor = getDifficultyColor(spell.difficulty);

  return (
    <Card 
      className={`spell-card ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{spell.icon}</span>
            <div>
              <CardTitle className="text-lg">{displayName}</CardTitle>
              {!isIPSafe && spell.name !== displayName && (
                <CardDescription className="text-xs italic">
                  Original: {spell.name}
                </CardDescription>
              )}
            </div>
          </div>
          
          {accuracy && (
            <div className="text-right">
              <div className="text-lg font-bold text-primary">
                {Math.round(accuracy * 100)}%
              </div>
              {matchType && (
                <Badge variant="outline" className="text-xs">
                  {matchType}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Element and Type */}
        <div className="flex gap-2">
          <Badge className={`${elementColor} bg-transparent border-current`}>
            {spell.element}
          </Badge>
          <Badge variant="outline">
            {spell.type}
          </Badge>
          <Badge className={`${difficultyColor} bg-transparent border-current`}>
            {spell.difficulty}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {spell.damage && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Damage:</span>
              <span className="text-fire font-semibold">{spell.damage}</span>
            </div>
          )}
          {spell.healing && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Healing:</span>
              <span className="text-nature font-semibold">{spell.healing}</span>
            </div>
          )}
          {spell.manaCost && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mana:</span>
              <span className="text-arcane font-semibold">{spell.manaCost}</span>
            </div>
          )}
          {spell.cooldown && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cooldown:</span>
              <span className="font-semibold">{(spell.cooldown / 1000).toFixed(1)}s</span>
            </div>
          )}
        </div>

        {/* Aliases (first few) */}
        {spell.aliases.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Also try:</div>
            <div className="flex flex-wrap gap-1">
              {spell.aliases.slice(0, 3).map((alias, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {alias}
                </Badge>
              ))}
              {spell.aliases.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{spell.aliases.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};