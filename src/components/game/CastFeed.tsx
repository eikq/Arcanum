import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type FeedItem = {
  id: string;
  caster: "you" | "foe";
  spell: string;
  acc: number;
  power: number;
  deltaHp?: number;
  ts: number;
  assist?: boolean;
};

export type CastFeedProps = {
  items: FeedItem[];
  className?: string;
};

export const CastFeed = ({ items, className }: CastFeedProps) => {
  const recentItems = items.slice(-8).reverse(); // Show last 8 casts, newest first

  return (
    <Card className={cn("w-80", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Recent Casts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="p-3 space-y-2">
            {recentItems.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No spells cast yet
              </div>
            ) : (
              recentItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    item.caster === "you" 
                      ? "bg-primary/10 border-primary/20" 
                      : "bg-muted/50 border-border",
                    item.assist && "opacity-75"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {item.spell}
                      </span>
                      {item.assist && (
                        <Badge variant="outline" className="text-xs">
                          Assist
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.caster === "you" ? "You" : "Opponent"}</span>
                      <span>•</span>
                      <span>{Math.round(item.acc * 100)}% acc</span>
                      <span>•</span>
                      <span>{Math.round(item.power * 100)}% power</span>
                    </div>
                  </div>
                  
                  {item.deltaHp && (
                    <Badge 
                      variant={item.deltaHp > 0 ? "default" : "destructive"}
                      className="text-xs ml-2"
                    >
                      {item.deltaHp > 0 ? '+' : ''}{item.deltaHp}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};