import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mic, Target, Zap, Shield, Heart, Wand2 } from 'lucide-react';

interface HowToPlayProps {
  onBack: () => void;
}

export const HowToPlay = ({ onBack }: HowToPlayProps) => {
  const spellTypes = [
    {
      icon: Zap,
      name: 'Attack Spells',
      color: 'text-fire',
      description: 'Deal damage to opponents with offensive magic',
      examples: ['Stupefy', 'Expelliarmus', 'Confringo']
    },
    {
      icon: Shield,
      name: 'Defensive Spells',
      color: 'text-light',
      description: 'Protect yourself with magical barriers',
      examples: ['Protego', 'Protego Maxima']
    },
    {
      icon: Heart,
      name: 'Healing Spells',
      color: 'text-nature',
      description: 'Restore health and cure ailments',
      examples: ['Episkey', 'Vulnera Sanentur']
    },
    {
      icon: Wand2,
      name: 'Utility Spells',
      color: 'text-arcane',
      description: 'Special effects and environmental manipulation',
      examples: ['Lumos', 'Alohomora', 'Accio']
    }
  ];

  const combos = [
    { elements: 'Fire + Wind', name: 'Inferno Cyclone', effect: 'Burning tornado (+50% damage)' },
    { elements: 'Lightning + Water', name: 'Thunderstorm Surge', effect: 'Electrified water (+60% damage)' },
    { elements: 'Ice + Wind', name: 'Hail Tempest', effect: 'Freezing winds (+40% damage)' },
    { elements: 'Light + Arcane', name: 'Aether Lance', effect: 'Pure energy beam (+70% damage)' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">How to Play Arcanum</h1>
        </div>

        <div className="space-y-8">
          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Learn the basics of voice-activated spellcasting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 mx-auto mb-3 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎤</span>
                  </div>
                  <h4 className="font-semibold mb-2">1. Enable Microphone</h4>
                  <p className="text-sm text-muted-foreground">
                    Allow microphone access when prompted to enable voice recognition
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 mx-auto mb-3 bg-nature/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🗣️</span>
                  </div>
                  <h4 className="font-semibold mb-2">2. Speak Clearly</h4>
                  <p className="text-sm text-muted-foreground">
                    Pronounce spell names clearly and at normal speaking volume
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 mx-auto mb-3 bg-fire/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h4 className="font-semibold mb-2">3. Cast Spells</h4>
                  <p className="text-sm text-muted-foreground">
                    Watch as your voice activates powerful magical effects
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spell Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Spell Types
              </CardTitle>
              <CardDescription>
                Different categories of spells and their effects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {spellTypes.map((type, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <type.icon className={`w-6 h-6 ${type.color}`} />
                      <h4 className="font-semibold">{type.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {type.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {type.examples.map((example, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {example}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Elemental Combos */}
          <Card>
            <CardHeader>
              <CardTitle>Elemental Combinations</CardTitle>
              <CardDescription>
                Cast compatible elements within 1.2 seconds for bonus damage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {combos.map((combo, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{combo.elements}</Badge>
                      <span className="text-sm font-semibold text-primary">{combo.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{combo.effect}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips and Tricks */}
          <Card>
            <CardHeader>
              <CardTitle>Tips for Success</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-nature">Pronunciation Tips</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Speak at normal conversational volume</li>
                    <li>• Enunciate each syllable clearly</li>
                    <li>• Try alternative pronunciations if not recognized</li>
                    <li>• Check spell aliases for easier alternatives</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-fire">Combat Strategy</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Start with easier spells to build confidence</li>
                    <li>• Learn elemental weaknesses and combos</li>
                    <li>• Balance offensive and defensive spells</li>
                    <li>• Practice in training mode before battle</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Microphone Not Working?</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Ensure your browser has microphone permissions and your device's microphone is working.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Spells Not Recognized?</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Try adjusting the sensitivity in settings, speak more clearly, or use spell aliases.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Performance Issues?</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Lower the graphics quality in settings or close other browser tabs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};