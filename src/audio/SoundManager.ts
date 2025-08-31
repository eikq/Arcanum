import { Howl, Howler } from 'howler';
import { SpellElement } from '@/types/game';

interface SoundConfig {
  volume?: number;
  pitch?: number;
  loop?: boolean;
  onend?: () => void;
}

interface ElementalSounds {
  cast: string[];
  impact: string[];
}

export class SoundManager {
  private sounds = new Map<string, Howl>();
  private musicTracks = new Map<string, Howl>();
  private currentMusic: Howl | null = null;
  private masterVolume = 0.8;
  private sfxVolume = 0.8;
  private musicVolume = 0.6;
  private isInitialized = false;

  // Sound data URIs - minimal demo sounds
  private soundData: Record<string, string> = {
    // Base UI sounds
    ui_click: this.generateTone(800, 0.1),
    ui_hover: this.generateTone(600, 0.05),
    ui_error: this.generateTone(200, 0.3),
    
    // Cast sounds
    cast_whoosh: this.generateSweep(400, 800, 0.4),
    cast_chime: this.generateTone(1200, 0.2),
    
    // Element layers
    fire_crackle: this.generateNoise(0.3),
    ice_chime: this.generateTone(1800, 0.3),
    lightning_zap: this.generateSweep(100, 2000, 0.2),
    nature_rustle: this.generateNoise(0.4),
    shadow_whisper: this.generateSweep(80, 300, 0.5),
    light_gleam: this.generateTone(2000, 0.3),
    arcane_hum: this.generateTone(440, 0.5),
    water_splash: this.generateNoise(0.25),
    wind_gust: this.generateSweep(200, 600, 0.6),
    earth_rumble: this.generateTone(100, 0.7),
    
    // Impact sounds
    impact_boom: this.generateTone(60, 0.4),
    impact_crack: this.generateNoise(0.2),
    impact_splash: this.generateSweep(300, 100, 0.3),
  };

  private elementalSounds: Record<SpellElement, ElementalSounds> = {
    fire: {
      cast: ['cast_whoosh', 'fire_crackle', 'cast_chime'],
      impact: ['impact_boom', 'fire_crackle'],
    },
    ice: {
      cast: ['cast_whoosh', 'ice_chime'],
      impact: ['impact_crack', 'ice_chime'],
    },
    lightning: {
      cast: ['lightning_zap', 'cast_chime'],
      impact: ['impact_boom', 'lightning_zap'],
    },
    nature: {
      cast: ['cast_whoosh', 'nature_rustle'],
      impact: ['nature_rustle'],
    },
    shadow: {
      cast: ['shadow_whisper', 'cast_chime'],
      impact: ['shadow_whisper'],
    },
    light: {
      cast: ['light_gleam', 'cast_chime'],
      impact: ['light_gleam'],
    },
    arcane: {
      cast: ['arcane_hum', 'cast_chime'],
      impact: ['arcane_hum'],
    },
    water: {
      cast: ['cast_whoosh', 'water_splash'],
      impact: ['impact_splash'],
    },
    wind: {
      cast: ['wind_gust'],
      impact: ['wind_gust'],
    },
    earth: {
      cast: ['earth_rumble', 'cast_chime'],
      impact: ['impact_boom', 'earth_rumble'],
    },
  };

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load all sound effects
      for (const [id, dataUri] of Object.entries(this.soundData)) {
        const howl = new Howl({
          src: [dataUri],
          volume: this.sfxVolume * this.masterVolume,
          preload: true,
        });
        this.sounds.set(id, howl);
      }

      // Load music tracks (simple tones for demo)
      const musicData = {
        menu_ambient: this.generateAmbient(220, 60), // 1 minute ambient
        match_intense: this.generateAmbient(440, 120), // 2 minute battle music
        victory: this.generateAmbient(660, 30), // 30 second victory
      };

      for (const [id, dataUri] of Object.entries(musicData)) {
        const howl = new Howl({
          src: [dataUri],
          volume: this.musicVolume * this.masterVolume,
          loop: true,
          preload: true,
        });
        this.musicTracks.set(id, howl);
      }

      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  }

  // Cast sound with elemental layers
  playCast(element: SpellElement, loudness: number = 0.8, config: SoundConfig = {}): void {
    if (!this.isInitialized) return;

    const elementSounds = this.elementalSounds[element];
    if (!elementSounds) return;

    // Play cast sounds with loudness-based volume and pitch variation
    elementSounds.cast.forEach((soundId, index) => {
      const sound = this.sounds.get(soundId);
      if (sound) {
        // Logarithmic volume curve for loudness
        const volume = Math.pow(loudness, 0.5) * this.sfxVolume * this.masterVolume;
        
        // Small pitch variation (±3%)
        const pitchVariation = 0.97 + Math.random() * 0.06;
        
        // Slight delay for layering
        const delay = index * 50;

        setTimeout(() => {
          sound.volume(volume * (config.volume || 1));
          sound.rate(pitchVariation * (config.pitch || 1));
          sound.play();
        }, delay);
      }
    });
  }

  // Impact sound
  playImpact(element: SpellElement, config: SoundConfig = {}): void {
    if (!this.isInitialized) return;

    const elementSounds = this.elementalSounds[element];
    if (!elementSounds) return;

    elementSounds.impact.forEach((soundId, index) => {
      const sound = this.sounds.get(soundId);
      if (sound) {
        const volume = this.sfxVolume * this.masterVolume;
        const pitchVariation = 0.97 + Math.random() * 0.06;
        const delay = index * 30;

        setTimeout(() => {
          sound.volume(volume * (config.volume || 1));
          sound.rate(pitchVariation * (config.pitch || 1));
          sound.play();
        }, delay);
      }
    });
  }

  // UI sounds
  playUI(type: 'click' | 'hover' | 'error'): void {
    if (!this.isInitialized) return;

    const soundId = `ui_${type}`;
    const sound = this.sounds.get(soundId);
    if (sound) {
      sound.volume(this.sfxVolume * this.masterVolume * 0.5);
      sound.play();
    }
  }

  // Music control
  playMusic(trackId: string, fadeIn: number = 1000): void {
    if (!this.isInitialized) return;

    const track = this.musicTracks.get(trackId);
    if (!track) return;

    // Stop current music
    if (this.currentMusic) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, fadeIn / 2);
      setTimeout(() => {
        if (this.currentMusic) {
          this.currentMusic.stop();
        }
      }, fadeIn / 2);
    }

    // Start new music
    track.volume(0);
    track.play();
    track.fade(0, this.musicVolume * this.masterVolume, fadeIn);
    this.currentMusic = track;
  }

  stopMusic(fadeOut: number = 1000): void {
    if (this.currentMusic) {
      this.currentMusic.fade(this.currentMusic.volume(), 0, fadeOut);
      setTimeout(() => {
        if (this.currentMusic) {
          this.currentMusic.stop();
          this.currentMusic = null;
        }
      }, fadeOut);
    }
  }

  // Volume controls
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateSFXVolumes();
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateMusicVolumes();
  }

  private updateAllVolumes(): void {
    this.updateSFXVolumes();
    this.updateMusicVolumes();
  }

  private updateSFXVolumes(): void {
    const volume = this.sfxVolume * this.masterVolume;
    this.sounds.forEach(sound => {
      sound.volume(volume);
    });
  }

  private updateMusicVolumes(): void {
    const volume = this.musicVolume * this.masterVolume;
    this.musicTracks.forEach(track => {
      track.volume(volume);
    });
  }

  // Generate demo audio (data URIs)
  private generateTone(frequency: number, duration: number): string {
    const sampleRate = 22050;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples * 2, true);

    // Generate tone with envelope
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3); // Exponential decay
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  private generateSweep(startFreq: number, endFreq: number, duration: number): string {
    const sampleRate = 22050;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    // WAV header (same as above)
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples * 2, true);

    // Generate frequency sweep
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      const frequency = startFreq + (endFreq - startFreq) * progress;
      const envelope = Math.exp(-t * 2);
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.25;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  private generateNoise(duration: number): string {
    const sampleRate = 22050;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples * 2, true);

    // Generate filtered noise
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 4);
      const noise = (Math.random() - 0.5) * 2;
      const sample = noise * envelope * 0.2;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  private generateAmbient(baseFreq: number, duration: number): string {
    const sampleRate = 22050;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples * 2, true);

    // Generate ambient pad with multiple oscillators
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      
      // Multiple sine waves for richness
      const osc1 = Math.sin(2 * Math.PI * baseFreq * t) * 0.3;
      const osc2 = Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.2;
      const osc3 = Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.1;
      
      // Slow LFO for modulation
      const lfo = Math.sin(2 * Math.PI * 0.1 * t) * 0.1 + 1;
      
      const sample = (osc1 + osc2 + osc3) * lfo * 0.15;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  destroy(): void {
    // Stop all sounds
    this.sounds.forEach(sound => sound.unload());
    this.musicTracks.forEach(track => track.unload());
    this.sounds.clear();
    this.musicTracks.clear();
    
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
  }
}

export const soundManager = new SoundManager();