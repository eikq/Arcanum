import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, Volume2 } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { VoiceIndicator } from './VoiceIndicator';
import { SpellCard } from './SpellCard';
import { findSpellMatches, calculateSpellPower } from '@/utils/spellMatcher';
import { SPELL_DATABASE } from '@/data/spells';
import { Spell, SpellElement, SpellDifficulty } from '@/types/game';

interface PracticeProps {
  onBack: () => void;
  isIPSafe: boolean;
}

export const Practice = ({ onBack, isIPSafe }: PracticeProps) => {
  const [selectedElement, setSelectedElement] = useState<SpellElement | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<SpellDifficulty | 'all'>('all');
  const [lastCastResult, setLastCastResult] = useState<{
    spell: Spell;
    accuracy: number;
    power: number;
    timestamp: number;
  } | null>(null);
  const [practiceStats, setPracticeStats] = useState({
    totalCasts: 0,
    averageAccuracy: 0,
    bestAccuracy: 0
  });

  const handleVoiceResult = useCallback((transcript: string, confidence: number, loudness: number) => {
    const matches = findSpellMatches(transcript, 0.4, 1);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      const power = calculateSpellPower(bestMatch.accuracy, loudness);
      
      if (power > 0) {
        setLastCastResult({
          spell: bestMatch.spell,
          accuracy: bestMatch.accuracy,
          power,
          timestamp: Date.now()
        });

        // Update stats
        setPracticeStats(prev => ({
          totalCasts: prev.totalCasts + 1,
          averageAccuracy: (prev.averageAccuracy * prev.totalCasts + bestMatch.accuracy) / (prev.totalCasts + 1),
          bestAccuracy: Math.max(prev.bestAccuracy, bestMatch.accuracy)
        }));
      }
    }
  }, []);

  const voiceState = useVoiceRecognition(handleVoiceResult, false);

  // Filter spells based on selection
  const filteredSpells = SPELL_DATABASE.filter(spell => {
    if (selectedElement !== 'all' && spell.element !== selectedElement) return false;
    if (selectedDifficulty !== 'all' && spell.difficulty !== selectedDifficulty) return false;
    return true;
  });

  // Get unique elements and difficulties for filters
  const elements = [...new Set(SPELL_DATABASE.map(s => s.element))];
  const difficulties = [...new Set(SPELL_DATABASE.map(s => s.difficulty))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Spell Practice</h1>
          </div>
        </div>

        {/* Voice Interface */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Voice Casting Interface
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <VoiceIndicator 
              voiceState={voiceState} 
              onToggle={voiceState.toggle}
            />
            
            {/* Last Cast Result */}
            {lastCastResult && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Last Cast Result</h4>
                  <Badge variant={lastCastResult.accuracy > 0.8 ? 'default' : 'outline'}>
                    {Math.round(lastCastResult.accuracy * 100)}% accuracy
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{lastCastResult.spell.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{lastCastResult.spell.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Power: {Math.round(lastCastResult.power * 100)}%
                    </div>
                  </div>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-fire via-light to-nature transition-all duration-500"
                      style={{ width: `${lastCastResult.power * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Practice Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Practice Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{practiceStats.totalCasts}</div>
                <div className="text-sm text-muted-foreground">Total Casts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-nature">
                  {Math.round(practiceStats.averageAccuracy * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Average Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-fire">
                  {Math.round(practiceStats.bestAccuracy * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Best Accuracy</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={selectedElement} onValueChange={(value) => setSelectedElement(value as SpellElement | 'all')}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by element" />
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
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Difficulties</SelectItem>
              {difficulties.map(difficulty => (
                <SelectItem key={difficulty} value={difficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1 text-right text-sm text-muted-foreground">
            Showing {filteredSpells.length} of {SPELL_DATABASE.length} spells
          </div>
        </div>

        {/* Spell Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpells.map(spell => (
            <SpellCard 
              key={spell.id} 
              spell={spell} 
              isIPSafe={isIPSafe}
              className="h-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};