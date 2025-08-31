import { useState, useCallback, useEffect } from 'react';
import { MainMenu } from './MainMenu';
import { Practice } from './Practice';
import { Settings } from './Settings';
import { HowToPlay } from './HowToPlay';
import { GameSettings } from '@/types/game';

// Default game settings
const DEFAULT_SETTINGS: GameSettings = {
  srLanguage: 'en-US',
  sensitivity: 0.6,
  hotwordEnabled: false,
  ipSafeMode: false,
  masterVolume: 0.8,
  sfxVolume: 0.8,
  musicVolume: 0.6,
  voiceVolume: 0.8,
  highContrast: false,
  fontSize: 100
};

export const GameEngine = () => {
  const [currentScreen, setCurrentScreen] = useState('main-menu');
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('arcanum-settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('arcanum-settings', JSON.stringify(gameSettings));
  }, [gameSettings]);

  const handleNavigate = useCallback((screen: string) => {
    setCurrentScreen(screen);
  }, []);

  const handleSettingsChange = useCallback((newSettings: Partial<GameSettings>) => {
    setGameSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'main-menu':
        return <MainMenu onNavigate={handleNavigate} />;
        
      case 'practice':
        return (
          <Practice 
            onBack={() => handleNavigate('main-menu')} 
            isIPSafe={gameSettings.ipSafeMode}
          />
        );
        
      case 'settings':
        return (
          <Settings 
            settings={gameSettings}
            onSettingsChange={handleSettingsChange}
            onBack={() => handleNavigate('main-menu')}
          />
        );
        
      case 'how-to-play':
        return (
          <HowToPlay 
            onBack={() => handleNavigate('main-menu')}
          />
        );
        
      default:
        return <MainMenu onNavigate={handleNavigate} />;
    }
  };

  return (
    <div 
      className="game-engine" 
      style={{ 
        fontSize: `${gameSettings.fontSize}%`,
        filter: gameSettings.highContrast ? 'contrast(150%) brightness(110%)' : 'none'
      }}
    >
      {renderScreen()}
    </div>
  );
};