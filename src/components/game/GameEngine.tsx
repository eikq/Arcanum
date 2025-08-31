import { useState, useCallback, useEffect } from 'react';
import { MainMenu } from './MainMenu';
import { Practice } from './Practice';
import { Settings } from './Settings';
import { HowToPlay } from './HowToPlay';
import { PlayMenu } from './PlayMenu';
import { Match } from './Match';
import { Lobby } from './Lobby';
import { GameSettings } from '@/types/game';
import { netClient } from '@/network/NetClient';

// Default game settings
const DEFAULT_SETTINGS: GameSettings = {
  srLanguage: 'en-US',
  sensitivity: 0.6,
  hotwordEnabled: false,
  ipSafeMode: false,
  minAccuracy: 0.4,
  alwaysCast: true,
  micSensitivity: 0.02,
  masterVolume: 0.8,
  sfxVolume: 0.8,
  musicVolume: 0.6,
  voiceVolume: 0.8,
  highContrast: false,
  fontSize: 100,
  pronunciationLeniency: 0.75
};

export const GameEngine = () => {
  const [currentScreen, setCurrentScreen] = useState('main-menu');
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
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

  // FIX: Initialize network connection and listen for state changes
  useEffect(() => {
    const handleConnectionChange = (state: 'disconnected' | 'connecting' | 'connected') => {
      setIsConnected(state === 'connected');
    };

    // Connect to server when component mounts
    const initializeConnection = async () => {
      try {
        await netClient.connect();
        setIsConnected(netClient.isConnected());
      } catch (error) {
        console.warn('Failed to connect to game server:', error);
        setIsConnected(false);
      }
    };

    netClient.on('connection_changed', handleConnectionChange);
    initializeConnection();

    return () => {
      netClient.off('connection_changed', handleConnectionChange);
    };
  }, []);

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
        
      case 'play-menu':
        return (
          <PlayMenu 
            onBack={() => handleNavigate('main-menu')}
            isConnected={isConnected}
            onStartMatch={async (mode, data) => {
              // FIX: Handle actual network calls for online matches
              try {
                if (mode === 'bot') {
                  setCurrentScreen(`match:bot:${data?.difficulty || 'medium'}`);
                } else if (mode === 'quick') {
                  const roomId = await netClient.quickMatch(data?.nick || 'Player');
                  setCurrentRoomId(roomId);
                  setCurrentScreen('lobby');
                } else if (mode === 'create') {
                  const roomId = await netClient.createRoom(data?.nick || 'Host');
                  setCurrentRoomId(roomId);
                  setCurrentScreen('lobby');
                } else if (mode === 'join') {
                  const roomId = await netClient.joinRoom(data?.roomCode, data?.nick || 'Player');
                  setCurrentRoomId(roomId);
                  setCurrentScreen('lobby');
                }
              } catch (error) {
                console.error('Failed to start match:', error);
                // Keep on play menu and let PlayMenu show error
              }
            }}
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
        
      case 'lobby':
        return (
          <Lobby 
            roomId={currentRoomId || ''}
            onBack={() => {
              if (currentRoomId) {
                netClient.leaveRoom();
                setCurrentRoomId(null);
              }
              handleNavigate('play-menu');
            }}
            onMatchStart={() => {
              setCurrentScreen('match');
            }}
          />
        );
        
      default:
        // FIX: Handle match screens with proper routing
        if (currentScreen.startsWith('match:')) {
          const [, mode, difficulty] = currentScreen.split(':');
          return (
            <Match
              mode={mode as 'quick' | 'bot' | 'code'}
              settings={gameSettings}
              onBack={() => {
                if (currentRoomId) {
                  netClient.leaveRoom();
                  setCurrentRoomId(null);
                }
                handleNavigate('main-menu');
              }}
              botDifficulty={difficulty as 'easy' | 'medium' | 'hard'}
              roomId={currentRoomId}
            />
          );
        }
        
        if (currentScreen === 'match') {
          return (
            <Match
              mode="quick"
              settings={gameSettings}
              onBack={() => {
                if (currentRoomId) {
                  netClient.leaveRoom();
                  setCurrentRoomId(null);
                }
                handleNavigate('main-menu');
              }}
              roomId={currentRoomId}
            />
          );
        }
        
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