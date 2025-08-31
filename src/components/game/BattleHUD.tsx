import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Zap, Crown, ArrowLeft, Timer, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BattleHUDProps = {
  you: { 
    name: string; 
    hp: number; 
    mp: number; 
    maxHp: number; 
    maxMp: number; 
    crown?: boolean;
  };
  foe: { 
    name: string; 
    hp: number; 
    mp: number; 
    maxHp: number; 
    maxMp: number; 
    isBot?: boolean;
  };
  time: string; // "MM:SS"
  onBack: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
};

export const BattleHUD = ({ 
  you, 
  foe, 
  time, 
  onBack, 
  isMuted = false, 
  onToggleMute 
}: BattleHUDProps) => {
  return (
    <div className="relative z-20 p-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={onBack} 
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to menu"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Timer className="w-4 h-4 mr-2" />
          {time}
        </Badge>
        
        <div className="flex items-center gap-2">
          {onToggleMute && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMute}
              className="text-muted-foreground hover:text-foreground"
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Player Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {/* You Card */}
        <Card className="bg-background/80 backdrop-blur border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-12 h-12 border-2 border-primary">
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {you.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{you.name}</h3>
                  {you.crown && <Crown className="w-5 h-5 text-yellow-500" />}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Health */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    Health
                  </span>
                  <span className="font-mono">{you.hp}/{you.maxHp}</span>
                </div>
                <Progress 
                  value={(you.hp / you.maxHp) * 100} 
                  className="h-3"
                />
              </div>
              
              {/* Mana */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Mana
                  </span>
                  <span className="font-mono">{you.mp}/{you.maxMp}</span>
                </div>
                <Progress 
                  value={(you.mp / you.maxMp) * 100} 
                  className="h-3"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opponent Card */}
        <Card className="bg-background/80 backdrop-blur border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-12 h-12 border-2 border-border">
                <AvatarFallback className="bg-muted text-muted-foreground font-bold">
                  {foe.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{foe.name}</h3>
                  {foe.isBot && <Badge variant="secondary">Bot</Badge>}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Health */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    Health
                  </span>
                  <span className="font-mono">{foe.hp}/{foe.maxHp}</span>
                </div>
                <Progress 
                  value={(foe.hp / foe.maxHp) * 100} 
                  className="h-3"
                />
              </div>
              
              {/* Mana */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Mana
                  </span>
                  <span className="font-mono">{foe.mp}/{foe.maxMp}</span>
                </div>
                <Progress 
                  value={(foe.mp / foe.maxMp) * 100} 
                  className="h-3"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};