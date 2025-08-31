import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceRecognitionState } from '@/types/game';

interface VoiceRecognitionHook extends VoiceRecognitionState {
  startListening: () => void;
  stopListening: () => void;
  toggle: () => void;
  resetTranscript: () => void;
  autoStartListening?: () => Promise<void>; // NEW: added to interface
}

export const useVoiceRecognition = (
  onResult?: (transcript: string, confidence: number, loudness: number) => void,
  hotwordEnabled = false,
  hotword = 'arcanum'
): VoiceRecognitionHook => {
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    isSupported: false,
    hasPermission: false,
    transcript: '',
    confidence: 0,
    loudness: 0
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const lastResultTimeRef = useRef<number>(0);

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
      };

      recognition.onend = () => {
        setState(prev => ({ ...prev, isListening: false }));
        
        // FIX: Auto-restart with capped backoff
        if (state.isListening) {
          let backoff = 500;
          const maxBackoff = 5000;
          const restartSR = () => {
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = setTimeout(() => {
              try {
                if (recognitionRef.current && state.isListening) {
                  recognitionRef.current.start();
                }
              } catch (error) {
                console.warn('Failed to restart SR:', error);
                backoff = Math.min(maxBackoff, backoff + 250);
                restartSR();
              }
            }, backoff);
          };
          restartSR();
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          setState(prev => ({ ...prev, hasPermission: false, isListening: false }));
        } else {
          // Retry on other errors
          setTimeout(() => {
            if (state.isListening) {
              try {
                recognition.start();
              } catch (error) {
                console.warn('Failed to restart after error:', error);
              }
            }
          }, 1000);
        }
      };

      recognition.onresult = (event) => {
        const results = event.results;
        const lastResult = results[results.length - 1];
        
        if (lastResult && lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim().toLowerCase();
          const confidence = lastResult[0].confidence;
          const now = Date.now();

          // FIX: RMS gate + debounce
          const rms = state.loudness;
          if (rms < 0.08) return; // Require minimum volume
          
          // Debounce identical transcripts within 500ms
          if (transcript === lastTranscriptRef.current && 
              now - lastResultTimeRef.current < 500) {
            return;
          }

          lastTranscriptRef.current = transcript;
          lastResultTimeRef.current = now;

          // Check for hotword if enabled
          if (hotwordEnabled) {
            if (transcript.includes(hotword)) {
              const spellPart = transcript.replace(hotword, '').trim();
              if (spellPart) {
                setState(prev => ({ ...prev, transcript: spellPart, confidence }));
                onResult?.(spellPart, confidence, state.loudness);
              }
            }
          } else {
            setState(prev => ({ ...prev, transcript, confidence }));
            onResult?.(transcript, confidence, state.loudness);
          }
        }
      };
    }

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [hotwordEnabled, hotword, onResult, state.isListening, state.loudness]);

  // FIX: Auto mic detection + init
  const initializeAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        } 
      });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 512;
      
      setState(prev => ({ ...prev, hasPermission: true }));
      
      // Start loudness monitoring immediately
      monitorLoudness();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      setState(prev => ({ ...prev, hasPermission: false }));
    }
  }, []);

  // FIX: Auto-start on mount for Practice/Match scenes
  const autoStartListening = useCallback(async () => {
    if (!state.hasPermission) {
      await initializeAudioContext();
    }
    // Auto-start SR after mic permission
    setTimeout(() => {
      if (recognitionRef.current && state.hasPermission && !state.isListening) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.warn('Auto-start failed:', error);
        }
      }
    }, 500);
  }, [state.hasPermission, state.isListening, initializeAudioContext]);

  // Monitor microphone loudness
  const monitorLoudness = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLoudness = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) for loudness
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length) / 255;
      
      setState(prev => ({ ...prev, loudness: rms }));
      
      if (state.isListening) {
        requestAnimationFrame(updateLoudness);
      }
    };
    
    updateLoudness();
  }, [state.isListening]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) return;
    
    if (!state.hasPermission) {
      await initializeAudioContext();
    }
    
    try {
      recognitionRef.current.start();
      setState(prev => ({ ...prev, isListening: true }));
    } catch (error) {
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Failed to start speech recognition:', error);
      }
    }
  }, [state.hasPermission, initializeAudioContext]);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  const toggle = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', confidence: 0 }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggle,
    resetTranscript,
    autoStartListening // NEW: expose auto-start for Practice/Match
  };
};