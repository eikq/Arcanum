import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { SPELL_DATABASE } from '@/data/spells';
import { SpellElement, SpellDifficulty } from '@/types/game';
import { getElementColor, getDifficultyColor } from '@/utils/spellMatcher';
import { cn } from '@/lib/utils';

interface SpellListProps {
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SpellList = ({ className, isCollapsed = false, onToggleCollapse }: SpellListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedElement, setSelectedElement] = useState<SpellElement | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<SpellDifficulty | 'all'>('all');

  // Filter spells based on search and filters
  const filteredSpells = SPELL_DATABASE.filter(spell => {
    const matchesSearch = !searchTerm || 
      spell.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spell.aliases.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesElement = selectedElement === 'all' || spell.element === selectedElement;
    const matchesDifficulty = selectedDifficulty === 'all' || spell.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesElement && matchesDifficulty;
  });

  // Get unique elements and difficulties
  const elements = [...new Set(SPELL_DATABASE.map(s => s.element))];
  const difficulties = [...new Set(SPELL_DATABASE.map(s => s.difficulty))];

  if (isCollapsed) {
    return (
      <Card className={cn("w-12", className)}>
        <CardContent className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full h-8 p-0"
          >
            <BookOpen className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-80", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            Spell Reference
          </CardTitle>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search spells..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedElement} onValueChange={(value) => setSelectedElement(value as SpellElement | 'all')}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Element" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Elements</SelectItem>
              {elements.map(element => (
                <SelectItem key={element} value={element}>
                  {element.charAt(0).toUpperCase() + element.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDifficulty} onValueChange={(value) => setSelectedDifficulty(value as SpellDifficulty | 'all')}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {difficulties.map(difficulty => (
                <SelectItem key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="text-xs text-muted-foreground text-center">
          {filteredSpells.length} of {SPELL_DATABASE.length} spells
        </div>

        {/* Spell List */}
        <ScrollArea className="h-96">
          <div className="space-y-2 pr-2">
            {filteredSpells.map(spell => (
              <div
                key={spell.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{spell.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1">{spell.name}</div>
                    
                    {/* Element and Difficulty */}
                    <div className="flex gap-1 mb-2">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getElementColor(spell.element))}
                      >
                        {spell.element}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getDifficultyColor(spell.difficulty))}
                      >
                        {spell.difficulty}
                      </Badge>
                    </div>

                    {/* Stats */}
                    <div className="text-xs text-muted-foreground space-y-1">
                      {spell.damage && (
                        <div className="flex justify-between">
                          <span>Damage:</span>
                          <span className="text-fire font-medium">{spell.damage}</span>
                        </div>
                      )}
                      {spell.healing && (
                        <div className="flex justify-between">
                          <span>Healing:</span>
                          <span className="text-nature font-medium">{spell.healing}</span>
                        </div>
                      )}
                      {spell.manaCost && (
                        <div className="flex justify-between">
                          <span>Mana:</span>
                          <span className="text-arcane font-medium">{spell.manaCost}</span>
                        </div>
                      )}
                    </div>

                    {/* First few aliases */}
                    {spell.aliases.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">Also try:</div>
                        <div className="flex flex-wrap gap-1">
                          {spell.aliases.slice(0, 2).map((alias, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {alias}
                            </Badge>
                          ))}
                          {spell.aliases.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{spell.aliases.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};