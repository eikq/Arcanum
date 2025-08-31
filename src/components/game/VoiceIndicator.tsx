import { Mic, MicOff, Volume2 } from 'lucide-react';
import { VoiceRecognitionState } from '@/types/game';

interface VoiceIndicatorProps {
  voiceState: VoiceRecognitionState;
  onToggle: () => void;
  className?: string;
}

export const VoiceIndicator = ({ voiceState, onToggle, className = '' }: VoiceIndicatorProps) => {
  const { isListening, hasPermission, loudness, transcript } = voiceState;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Microphone Button */}
      <button
        onClick={onToggle}
        disabled={!hasPermission}
        className={`
          w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
          ${isListening 
            ? 'bg-fire text-white shadow-[var(--shadow-fire)]' 
            : hasPermission 
              ? 'bg-primary text-primary-foreground hover:bg-primary/80' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }
          ${isListening ? 'voice-indicator' : ''}
        `}
        title={hasPermission ? (isListening ? 'Stop Listening' : 'Start Listening') : 'Microphone Permission Required'}
      >
        {hasPermission ? (
          isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </button>

      {/* Voice Level Indicator */}
      {isListening && (
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-nature via-light to-fire transition-all duration-150"
              style={{ width: `${Math.min(loudness * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground min-w-[3ch]">
            {Math.round(loudness * 100)}%
          </span>
        </div>
      )}

      {/* Status Text */}
      <div className="flex-1 text-sm">
        {!hasPermission ? (
          <span className="text-destructive">Microphone access required</span>
        ) : isListening ? (
          <span className="text-nature">
            Listening... {transcript && `"${transcript}"`}
          </span>
        ) : (
          <span className="text-muted-foreground">Click to start voice recognition</span>
        )}
      </div>
    </div>
  );
};