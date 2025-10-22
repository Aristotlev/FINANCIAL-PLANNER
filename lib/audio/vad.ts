/**
 * Voice Activity Detection (VAD)
 * Adaptive RMS-based detection with configurable thresholds
 * Detects speech start/end for optimal turn-taking
 */

export interface VADConfig {
  /** Sample rate of audio input */
  sampleRate: number;
  
  /** Initial RMS threshold for speech detection */
  threshold: number;
  
  /** Minimum RMS threshold (adaptive lower bound) */
  minThreshold: number;
  
  /** Maximum RMS threshold (adaptive upper bound) */
  maxThreshold: number;
  
  /** Trailing silence duration to consider utterance complete (ms) */
  silenceTimeout: number;
  
  /** Minimum speech duration to consider valid (ms) */
  minSpeechDuration: number;
  
  /** Adaptation rate for threshold adjustment (0-1) */
  adaptationRate: number;
  
  /** Number of frames to average for smoothing */
  smoothingFrames: number;
}

export const DEFAULT_VAD_CONFIG: VADConfig = {
  sampleRate: 16000,
  threshold: 0.015,
  minThreshold: 0.008,
  maxThreshold: 0.05,
  silenceTimeout: 800, // 800ms of silence = end of utterance
  minSpeechDuration: 300, // Ignore clicks/pops under 300ms
  adaptationRate: 0.1,
  smoothingFrames: 3,
};

export enum VADState {
  SILENCE = 'silence',
  SPEECH = 'speech',
  PENDING = 'pending', // Transitioning
}

export class VoiceActivityDetector {
  private config: VADConfig;
  private state: VADState = VADState.SILENCE;
  private energyHistory: number[] = [];
  private silenceStartTime: number | null = null;
  private speechStartTime: number | null = null;
  private adaptiveThreshold: number;
  private noiseFloor: number = 0;
  
  constructor(config?: Partial<VADConfig>) {
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
    this.adaptiveThreshold = this.config.threshold;
  }

  /**
   * Process an audio frame and return VAD state
   * @param audioData Float32Array of audio samples
   * @returns Current VAD state
   */
  process(audioData: Float32Array): VADState {
    // Calculate RMS energy
    const energy = this.calculateRMS(audioData);
    
    // Update energy history for smoothing
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.config.smoothingFrames) {
      this.energyHistory.shift();
    }
    
    // Smooth energy
    const smoothedEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    
    // Update adaptive threshold and noise floor
    this.adaptThreshold(smoothedEnergy);
    
    const now = Date.now();
    const isSpeech = smoothedEnergy > this.adaptiveThreshold;
    
    // State machine
    switch (this.state) {
      case VADState.SILENCE:
        if (isSpeech) {
          this.speechStartTime = now;
          this.silenceStartTime = null;
          this.state = VADState.PENDING;
          console.log('[VAD] Speech detected');
        }
        break;
        
      case VADState.PENDING:
        const speechDuration = now - (this.speechStartTime || now);
        
        if (!isSpeech) {
          // False positive, back to silence
          this.state = VADState.SILENCE;
          this.speechStartTime = null;
        } else if (speechDuration >= this.config.minSpeechDuration) {
          // Confirmed speech
          this.state = VADState.SPEECH;
          console.log('[VAD] Speech confirmed');
        }
        break;
        
      case VADState.SPEECH:
        if (!isSpeech) {
          if (!this.silenceStartTime) {
            this.silenceStartTime = now;
          } else {
            const silenceDuration = now - this.silenceStartTime;
            
            if (silenceDuration >= this.config.silenceTimeout) {
              // End of utterance
              this.state = VADState.SILENCE;
              this.speechStartTime = null;
              this.silenceStartTime = null;
              console.log('[VAD] End of utterance detected');
            }
          }
        } else {
          // Still speaking
          this.silenceStartTime = null;
        }
        break;
    }
    
    return this.state;
  }

  /**
   * Calculate RMS energy of audio frame
   */
  private calculateRMS(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  /**
   * Adapt threshold based on background noise
   */
  private adaptThreshold(energy: number): void {
    // Update noise floor estimate (slow adaptation)
    if (this.state === VADState.SILENCE) {
      this.noiseFloor = this.noiseFloor * 0.95 + energy * 0.05;
    }
    
    // Adapt threshold based on noise floor
    const targetThreshold = Math.max(
      this.config.minThreshold,
      Math.min(
        this.config.maxThreshold,
        this.noiseFloor * 2.5 // Threshold is 2.5x noise floor
      )
    );
    
    // Smooth adaptation
    this.adaptiveThreshold = 
      this.adaptiveThreshold * (1 - this.config.adaptationRate) + 
      targetThreshold * this.config.adaptationRate;
  }

  /**
   * Get current VAD state
   */
  getState(): VADState {
    return this.state;
  }

  /**
   * Check if speech is active
   */
  isSpeechActive(): boolean {
    return this.state === VADState.SPEECH || this.state === VADState.PENDING;
  }

  /**
   * Get current energy level (0-1)
   */
  getEnergyLevel(): number {
    if (this.energyHistory.length === 0) return 0;
    return this.energyHistory[this.energyHistory.length - 1];
  }

  /**
   * Get current adaptive threshold
   */
  getThreshold(): number {
    return this.adaptiveThreshold;
  }

  /**
   * Get noise floor estimate
   */
  getNoiseFloor(): number {
    return this.noiseFloor;
  }

  /**
   * Reset VAD state
   */
  reset(): void {
    this.state = VADState.SILENCE;
    this.energyHistory = [];
    this.silenceStartTime = null;
    this.speechStartTime = null;
    this.adaptiveThreshold = this.config.threshold;
    console.log('[VAD] Reset');
  }

  /**
   * Force state (useful for manual control)
   */
  setState(state: VADState): void {
    this.state = state;
    if (state === VADState.SILENCE) {
      this.speechStartTime = null;
      this.silenceStartTime = null;
    }
  }
}
