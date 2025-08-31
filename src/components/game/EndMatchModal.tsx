import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Trophy, Skull, Wifi, Bot, RotateCcw, Home, ChevronRight } from 'lucide-react';
import type { FeedItem } from './CastFeed';

export type EndKind = "victory" | "defeat" | "disconnect";

export type EndMatchModalProps = {
  kind: EndKind;
  youDmg: number;
  foeDmg: number;
  casts: FeedItem[];
  onPlayAgain: () => void;
  onBackToMenu: () => void;
  onNextBot?: () => void; // only vs bot
  isOpen: boolean;
};

export const EndMatchModal = ({
  kind,
  youDmg,
  foeDmg,
  casts,
  onPlayAgain,
  onBackToMenu,
  onNextBot,
  isOpen
}: EndMatchModalProps) => {
  const yourCasts = casts.filter(c => c.caster === "you");
  const avgAccuracy = yourCasts.length > 0 
    ? yourCasts.reduce((sum, c) => sum + c.acc, 0) / yourCasts.length 
    : 0;
  
  const topSpell = yourCasts.length > 0 
    ? yourCasts.reduce((best, current) => 
        current.acc > best.acc ? current : best
      ).spell
    : null;

  const getTitle = () => {
    switch (kind) {
      case "victory": return "🏆 Victory!";
      case "defeat": return "💀 Defeat";
      case "disconnect": return "⚡ Connection Lost";
      default: return "Match Ended";
    }
  };

  const getDescription = () => {
    switch (kind) {
      case "victory": return "Your voice magic proved superior!";
      case "defeat": return "Your opponent's spells overwhelmed you.";
      case "disconnect": return "The connection to your opponent was lost.";
      default: return "The match has concluded.";
    }
  };

  const getIcon = () => {
    switch (kind) {
      case "victory": return <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />;
      case "defeat": return <Skull className="w-16 h-16 text-red-500 mx-auto mb-4" />;
      case "disconnect": return <Wifi className="w-16 h-16 text-muted-foreground mx-auto mb-4" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="text-center">
          {getIcon()}
          <DialogTitle className="text-3xl font-bold mb-2">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-lg">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Match Statistics */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">{yourCasts.length}</div>
                <div className="text-sm text-muted-foreground">Spells Cast</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-nature">
                  {Math.round(avgAccuracy * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Accuracy</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-fire">{youDmg}</div>
                <div className="text-sm text-muted-foreground">Damage Dealt</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-destructive">{foeDmg}</div>
                <div className="text-sm text-muted-foreground">Damage Taken</div>
              </CardContent>
            </Card>
          </div>

          {topSpell && (
            <div className="text-center">
              <Badge variant="outline" className="text-sm">
                Best Cast: {topSpell}
              </Badge>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={onPlayAgain}
              className="gap-2 min-w-[140px]"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </Button>
            
            {onNextBot && (
              <Button 
                onClick={onNextBot}
                variant="outline"
                className="gap-2 min-w-[140px]"
              >
                <Bot className="w-4 h-4" />
                Next Bot
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            
            <Button 
              onClick={onBackToMenu}
              variant="outline"
              className="gap-2 min-w-[140px]"
            >
              <Home className="w-4 h-4" />
              Main Menu
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};