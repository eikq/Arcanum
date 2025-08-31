import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Play, BookOpen, Bot, Users, Wand2 } from 'lucide-react';

interface MainMenuProps {
  onNavigate: (screen: string) => void;
}

export const MainMenu = ({ onNavigate }: MainMenuProps) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const menuItems = [
    {
      id: 'play',
      title: 'Play Online',
      description: 'Challenge wizards from around the world',
      icon: Users,
      gradient: 'from-primary to-accent',
      onClick: () => onNavigate('play-menu')
    },
    {
      id: 'practice',
      title: 'Practice Spells',
      description: 'Perfect your pronunciation and technique',
      icon: BookOpen,
      gradient: 'from-nature to-light',
      onClick: () => onNavigate('practice')
    },
    {
      id: 'bot',
      title: 'Battle AI',
      description: 'Test your skills against magical constructs',
      icon: Bot,
      gradient: 'from-arcane to-lightning',
      onClick: () => onNavigate('match:bot:medium') // FIX: Direct to bot match
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="relative mb-6">
          <Wand2 className="w-16 h-16 mx-auto text-primary arcane-glow" />
          <div className="absolute inset-0 w-16 h-16 mx-auto">
            <div className="w-full h-full bg-primary/20 rounded-full animate-ping" />
          </div>
        </div>
        <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-4">
          Arcanum
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Master the ancient art of voice-activated spellcasting. Speak your incantations and unleash magical power!
        </p>
      </div>

      {/* Menu Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-8">
        {menuItems.map((item) => (
          <Card
            key={item.id}
            className={`spell-card cursor-pointer transition-all duration-300 ${
              hoveredCard === item.id ? 'scale-105' : ''
            }`}
            onMouseEnter={() => setHoveredCard(item.id)}
            onMouseLeave={() => setHoveredCard(null)}
            onClick={item.onClick}
          >
            <CardHeader className="text-center pb-4">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                <item.icon className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base">
                {item.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => onNavigate('settings')}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => onNavigate('how-to-play')}
          className="gap-2"
        >
          <BookOpen className="w-4 h-4" />
          How to Play
        </Button>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Use voice commands to cast spells • Microphone permission required</p>
        {/* TODO: Add disclaimer about IP-safe mode in settings */}
      </div>
    </div>
  );
};