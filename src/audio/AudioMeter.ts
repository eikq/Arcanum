// Real-time audio metering with RMS and dBFS calculation
import { subscribeMicState, type MicState } from './MicBootstrap';

export interface AudioMeterState {
  rms: number;
  dbfs: number;
  isActive: boolean;
}

export interface MeterCalib {
  noiseFloor: number;
  peakRms: number;
  minRms: number;
  rmsMargin: number;
  calibrated: boolean;
}

export type AudioMeterCallback = (state: AudioMeterState) => void;

export class AudioMeter {
  private subscribers = new Set<AudioMeterCallback>();
  private isRunning = false;
  private micStateUnsubscribe?: () => void;
  private animationFrame?: number;
  
  // EMA smoothing factor (α ≈ 0.35 for smooth but responsive)
  private smoothingFactor = 0.35;
  private smoothedRms = 0;
  private smoothedDbfs = -60;

  // Calibration state
  private calibration: MeterCalib = {
    noiseFloor: 0.01,
    peakRms: 0.15,
    minRms: 0.02,
    rmsMargin: 0.01,
    calibrated: false
  };
  private calibrationSamples: number[] = [];
  private calibrationStartTime = 0;
  private userMinRms = 0.02;

  async initialize(stream: MediaStream): Promise<void> {
    // MicBootstrap handles the actual audio setup
    // This method exists for compatibility
    console.log('AudioMeter: Using MicBootstrap for audio setup');
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startCalibration();
    
    // Subscribe to mic state updates
    this.micStateUnsubscribe = subscribeMicState((micState: MicState) => {
      if (micState.ready === "ready") {
        this.updateFromMicState(micState);
      }
    });
    
    this.startMeterLoop();
  }

  private startCalibration(): void {
    this.calibrationSamples = [];
    this.calibrationStartTime = performance.now();
    this.calibration.calibrated = false;
    console.log('AudioMeter: Starting calibration phase...');
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    
    if (this.micStateUnsubscribe) {
      this.micStateUnsubscribe();
      this.micStateUnsubscribe = undefined;
    }
  }

  private startMeterLoop(): void {
    const updateMeter = () => {
      if (!this.isRunning) return;
      
      // Notify subscribers with current smoothed values
      const state: AudioMeterState = {
        rms: this.smoothedRms,
        dbfs: this.smoothedDbfs,
        isActive: this.isRunning
      };

      this.subscribers.forEach(callback => callback(state));
      
      this.animationFrame = requestAnimationFrame(updateMeter);
    };
    
    updateMeter();
  }

  private updateFromMicState(micState: MicState): void {
    // Apply EMA smoothing
    this.smoothedRms = this.smoothingFactor * micState.rms + (1 - this.smoothingFactor) * this.smoothedRms;
    this.smoothedDbfs = this.smoothingFactor * micState.dbfs + (1 - this.smoothingFactor) * this.smoothedDbfs;

    // Collect calibration samples
    if (!this.calibration.calibrated) {
      this.calibrationSamples.push(micState.rms);
      
      const elapsed = performance.now() - this.calibrationStartTime;
      if (elapsed >= 800 && this.calibrationSamples.length >= 20) {
        this.finishCalibration();
      }
    }
  }

  private finishCalibration(): void {
    if (this.calibrationSamples.length === 0) return;
    
    // Sort samples for percentile calculation
    const sorted = [...this.calibrationSamples].sort((a, b) => a - b);
    
    // Calculate noise floor (median) and peak (95th percentile)
    const medianIndex = Math.floor(sorted.length * 0.5);
    const peakIndex = Math.floor(sorted.length * 0.95);
    
    this.calibration.noiseFloor = sorted[medianIndex];
    this.calibration.peakRms = sorted[peakIndex];
    this.calibration.minRms = Math.max(
      this.userMinRms,
      this.calibration.noiseFloor + this.calibration.rmsMargin
    );
    this.calibration.calibrated = true;
    
    console.log('AudioMeter: Calibration complete', {
      noiseFloor: this.calibration.noiseFloor.toFixed(4),
      peakRms: this.calibration.peakRms.toFixed(4),
      minRms: this.calibration.minRms.toFixed(4),
      samples: this.calibrationSamples.length
    });
  }

  getCalibration(): MeterCalib {
    return { ...this.calibration };
  }

  setUserMinRms(val: number): void {
    this.userMinRms = val;
    if (this.calibration.calibrated) {
      this.calibration.minRms = Math.max(
        this.userMinRms,
        this.calibration.noiseFloor + this.calibration.rmsMargin
      );
    }
  }

  setRmsMargin(val: number): void {
    this.calibration.rmsMargin = val;
    if (this.calibration.calibrated) {
      this.calibration.minRms = Math.max(
        this.userMinRms,
        this.calibration.noiseFloor + this.calibration.rmsMargin
      );
    }
  }

  normalizedRms(rms: number): number {
    if (!this.calibration.calibrated) return 0;
    
    const span = Math.max(0.08, this.calibration.peakRms - this.calibration.noiseFloor);
    return Math.max(0, Math.min(1, (rms - this.calibration.noiseFloor) / span));
  }

  subscribe(callback: AudioMeterCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getRms(): number {
    return this.smoothedRms;
  }

  getDbfs(): number {
    return this.smoothedDbfs;
  }

  destroy(): void {
    this.stop();
    this.subscribers.clear();
  }

  // Static utility functions
  static computeRms(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const sample = buffer[i];
      sum += sample * sample;
    }
    return Math.sqrt(sum / buffer.length);
  }

  static rmsToDbfs(rms: number): number {
    return 20 * Math.log10(Math.max(rms, 1e-8));
  }
}