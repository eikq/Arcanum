import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceRecognitionState } from '@/types/game';
import { AudioMeter, AudioMeterState } from '@/audio/AudioMeter';

// Enhanced SR result types
export type SRResult = { transcript: string; isFinal: boolean; alt?: string[] };

export interface UseSpeechRecognition {
  start: () => Promise<void>;
  stop: () => void;
  restart: () => Promise<void>;
  listening: boolean;
  supported: boolean;
  hasPermission: boolean;
  interim?: string;
  final?: string;
  error?: string;
  dbfs: number;
  rms: () => number;
  micDenied: boolean;
  onInterim?: (t: string) => void;
  onFinal?: (t: string) => void;
  
  // Legacy compatibility
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  loudness: number;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggle: () => void;
  resetTranscript: () => void;
  primeMic: (deviceId?: string) => Promise<MediaStream>;
  autoStartListening: () => Promise<void>;
}

export const useVoiceRecognition = (
  onResult?: (transcript: string, confidence: number, loudness: number) => void,
  hotwordEnabled = false,
  hotword = 'arcanum',
  onInterimCallback?: (transcript: string) => void,
  onFinalCallback?: (transcript: string) => void
): UseSpeechRecognition => {
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    isSupported: false,
    hasPermission: false,
    transcript: '',
    confidence: 0,
    loudness: 0
  });

  // Enhanced state
  const [interim, setInterim] = useState('');
  const [final, setFinal] = useState('');
  const [micDenied, setMicDenied] = useState(false);
  const [error, setError] = useState<string>();
  const [dbfs, setDbfs] = useState(-60);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioMeterRef = useRef<AudioMeter | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef<number>(500);

  // Callback refs for external setting
  const onInterimRef = useRef<((t: string) => void) | undefined>(onInterimCallback);
  const onFinalRef = useRef<((t: string) => void) | undefined>(onFinalCallback);

  // Update callback refs
  useEffect(() => {
    onInterimRef.current = onInterimCallback;
    onFinalRef.current = onFinalCallback;
  }, [onInterimCallback, onFinalCallback]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setState(prev => ({ ...prev, isSupported: true }));
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 3;

      recognitionRef.current = recognition;

      // Speech recognition event handlers
      recognition.onstart = () => {
        setState(prev => ({ ...prev, isListening: true }));
        setError(undefined);
      };

      recognition.onend = () => {
        setState(prev => ({ ...prev, isListening: false }));
        
        // Auto-restart with capped backoff if we were supposed to be listening
        if (state.isListening && !micDenied) {
          const restartSR = () => {
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = setTimeout(() => {
              try {
                if (recognitionRef.current && state.isListening) {
                  recognition.start();
                  backoffRef.current = 500; // Reset on success
                }
              } catch (error) {
                console.warn('Failed to restart SR:', error);
                backoffRef.current = Math.min(5000, backoffRef.current * 1.5);
                restartSR();
              }
            }, backoffRef.current);
          };
          restartSR();
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          setState(prev => ({ ...prev, hasPermission: false, isListening: false }));
          setMicDenied(true);
          setError('Microphone permission denied');
        } else if (event.error === 'no-speech') {
          // This is normal, just restart
          if (state.isListening) {
            setTimeout(() => {
              try {
                if (recognitionRef.current && state.isListening) {
                  recognition.start();
                }
              } catch (e) {
                console.warn('Failed to restart after no-speech:', e);
              }
            }, 1000);
          }
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onresult = (event) => {
        const results = event.results;
        let interimTranscript = '';
        
        // Process all results
        for (let i = event.resultIndex; i < results.length; i++) {
          const result = results[i];
          const transcript = result[0].transcript.trim();
          
          if (result.isFinal) {
            const confidence = result[0].confidence || 0.9;

            // Update final transcript
            setFinal(transcript);
            onFinalRef.current?.(transcript);

            // Legacy handling - check for hotword if enabled
            if (hotwordEnabled && transcript) {
              const lowerTranscript = transcript.toLowerCase();
              const lowerHotword = hotword.toLowerCase();
              
              if (lowerTranscript.includes(lowerHotword)) {
                const spellPart = lowerTranscript.replace(lowerHotword, '').trim();
                if (spellPart) {
                  setState(prev => ({ ...prev, transcript: spellPart, confidence }));
                  onResult?.(spellPart, confidence, state.loudness);
                }
              }
            } else if (transcript) {
              setState(prev => ({ ...prev, transcript, confidence }));
              onResult?.(transcript, confidence, state.loudness);
            }

            // Clear interim after final
            setInterim('');
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update interim transcript
        if (interimTranscript) {
          setInterim(interimTranscript);
          onInterimRef.current?.(interimTranscript);
        }
      };
    } else {
      console.warn('Speech recognition not supported');
      setState(prev => ({ ...prev, isSupported: false }));
    }

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [hotwordEnabled, hotword, onResult, state.isListening, state.loudness, micDenied]);

  // Prime microphone with AudioMeter integration
  const primeMic = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 44100
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Initialize AudioMeter
      if (!audioMeterRef.current) {
        audioMeterRef.current = new AudioMeter();
      }
      
      await audioMeterRef.current.initialize(stream);
      
      // Subscribe to audio meter updates
      audioMeterRef.current.subscribe((meterState: AudioMeterState) => {
        setState(prev => ({ ...prev, loudness: meterState.rms }));
        setDbfs(meterState.dbfs);
      });
      
      audioMeterRef.current.start();
      
      setState(prev => ({ ...prev, hasPermission: true }));
      setMicDenied(false);
      setError(undefined);
      
      return stream;
    } catch (error) {
      console.error('Failed to prime microphone:', error);
      setState(prev => ({ ...prev, hasPermission: false }));
      setMicDenied(true);
      setError(error instanceof Error ? error.message : 'Microphone error');
      throw error;
    }
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }
    
    if (!state.hasPermission) {
      await primeMic();
    }
    
    try {
      recognitionRef.current.start();
      setState(prev => ({ ...prev, isListening: true }));
      setError(undefined);
    } catch (error) {
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Failed to start speech recognition:', error);
        setError(error.message);
      }
    }
  }, [state.hasPermission, primeMic]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (audioMeterRef.current) {
      audioMeterRef.current.stop();
    }
    
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  // Restart with exponential backoff
  const restart = useCallback(async () => {
    stopListening();
    await new Promise(resolve => setTimeout(resolve, backoffRef.current));
    await startListening();
  }, [startListening, stopListening]);

  // Toggle listening
  const toggle = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', confidence: 0 }));
    setInterim('');
    setFinal('');
  }, []);

  // RMS getter
  const rms = useCallback(() => {
    return audioMeterRef.current?.getRms() ?? state.loudness;
  }, [state.loudness]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (audioMeterRef.current) {
        audioMeterRef.current.cleanup();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Legacy compatibility method
  const autoStartListening = useCallback(async () => {
    if (!state.hasPermission) {
      await primeMic();
    }
    await startListening();
  }, [state.hasPermission, primeMic, startListening]);

  return {
    // New API
    start: startListening,
    stop: stopListening,
    restart,
    listening: state.isListening,
    supported: state.isSupported,
    hasPermission: state.hasPermission,
    interim,
    final,
    error,
    dbfs,
    rms,
    micDenied,
    onInterim: onInterimRef.current,
    onFinal: onFinalRef.current,
    
    // Legacy API
    isListening: state.isListening,
    isSupported: state.isSupported,
    transcript: state.transcript,
    confidence: state.confidence,
    loudness: state.loudness,
    startListening,
    stopListening,
    toggle,
    resetTranscript,
    primeMic,
    autoStartListening
  };
};