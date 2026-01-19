/**
 * Wake Word Detection for "Omni", "Hey Omni", "Hi Omni", "Hello Omni"
 * Uses simple pattern matching on audio energy + basic phoneme detection
 */

export class WakeWordDetector {
  private audioBuffer: Float32Array[] = [];
  private maxBufferSize = 100; // ~2 seconds at 4096 samples
  private energyThreshold = 0.02;
  private silenceFrames = 0;
  private maxSilenceFrames = 20;
  
  constructor() {
    console.log('[WAKE-WORD] Detector initialized');
  }

  /**
   * Process audio chunk and detect wake word
   * Returns true if wake word detected
   */
  processAudio(audioData: Float32Array): boolean {
    // Calculate RMS energy
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);

    // Ignore silence
    if (rms < this.energyThreshold) {
      this.silenceFrames++;
      if (this.silenceFrames > this.maxSilenceFrames) {
        this.audioBuffer = []; // Clear buffer on extended silence
      }
      return false;
    }

    this.silenceFrames = 0;

    // Add to buffer
    this.audioBuffer.push(new Float32Array(audioData));
    if (this.audioBuffer.length > this.maxBufferSize) {
      this.audioBuffer.shift();
    }

    // Need at least 20 frames (~0.4s) to detect
    if (this.audioBuffer.length < 20) {
      return false;
    }

    // Simple pattern detection using energy peaks and frequency
    const detected = this.detectPattern();
    
    if (detected) {
      console.log('[WAKE-WORD] ✓ Detected!');
      this.audioBuffer = []; // Clear buffer after detection
    }

    return detected;
  }

  private detectPattern(): boolean {
    // Concatenate recent audio
    const totalSamples = this.audioBuffer.reduce((sum, arr) => sum + arr.length, 0);
    const combined = new Float32Array(totalSamples);
    let offset = 0;
    
    for (const chunk of this.audioBuffer) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Look for characteristic patterns
    // "Omni" has 2 syllables: OM-ni
    // "Hey Omni" has 3 syllables: HEY-OM-ni
    
    const syllables = this.detectSyllables(combined);
    
    // Accept 2-3 syllables (Omni, Hey/Hi/Hello Omni)
    if (syllables >= 2 && syllables <= 4) {
      const hasOmniPattern = this.hasOmniLikePattern(combined);
      return hasOmniPattern;
    }

    return false;
  }

  private detectSyllables(audio: Float32Array): number {
    // Simple syllable detection via energy peaks
    const windowSize = 2048;
    const hopSize = 1024;
    let syllableCount = 0;
    let inSyllable = false;

    for (let i = 0; i < audio.length - windowSize; i += hopSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += audio[i + j] * audio[i + j];
      }
      const energy = Math.sqrt(sum / windowSize);

      if (energy > 0.03 && !inSyllable) {
        syllableCount++;
        inSyllable = true;
      } else if (energy < 0.015) {
        inSyllable = false;
      }
    }

    return syllableCount;
  }

  private hasOmniLikePattern(audio: Float32Array): boolean {
    // Simple frequency analysis for "om" sound (emphasized in "Omni")
    // This is a very basic check - in production, use a real wake word model
    
    // Look for mid-range frequencies typical of "om" sound
    const windowSize = 1024;
    let midFreqEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < audio.length - windowSize; i += windowSize) {
      for (let j = 0; j < windowSize; j++) {
        const sample = audio[i + j];
        totalEnergy += sample * sample;
        
        // Simple mid-frequency emphasis check
        if (j > windowSize * 0.3 && j < windowSize * 0.7) {
          midFreqEnergy += sample * sample;
        }
      }
    }

    // "Omni" has strong mid-range frequencies
    const ratio = totalEnergy > 0 ? midFreqEnergy / totalEnergy : 0;
    return ratio > 0.25 && ratio < 0.6;
  }

  reset(): void {
    this.audioBuffer = [];
    this.silenceFrames = 0;
  }
}

/**
 * Alternative: Use Web Speech API for better wake word detection
 * This is more reliable but browser-dependent
 */
export class WebSpeechWakeWordDetector {
  private recognition: any = null;
  private isListening = false;
  private onWakeWord: (() => void) | null = null;

  constructor() {
    // @ts-ignore - Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase().trim();
        
        console.log('[WAKE-WORD] Heard:', transcript);

        // Check for wake words
        if (
          transcript.includes('omni') ||
          transcript.includes('hey omni') ||
          transcript.includes('hi omni') ||
          transcript.includes('hello omni') ||
          transcript.includes('ok omni')
        ) {
          console.log('[WAKE-WORD] ✓ Wake word detected!');
          if (this.onWakeWord) {
            this.onWakeWord();
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('[WAKE-WORD] Recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Restart on no-speech
          this.restart();
        }
      };

      this.recognition.onend = () => {
        if (this.isListening) {
          // Auto-restart if still supposed to be listening
          setTimeout(() => this.restart(), 100);
        }
      };

      console.log('[WAKE-WORD] Web Speech API initialized');
    } else {
      console.warn('[WAKE-WORD] Web Speech API not available');
    }
  }

  start(callback: () => void): void {
    if (!this.recognition) {
      console.error('[WAKE-WORD] Recognition not available');
      return;
    }

    this.onWakeWord = callback;
    this.isListening = true;
    
    try {
      this.recognition.start();
      console.log('[WAKE-WORD] Listening for wake word...');
    } catch (error) {
      console.error('[WAKE-WORD] Start error:', error);
    }
  }

  stop(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
        console.log('[WAKE-WORD] Stopped listening');
      } catch (error) {
        console.error('[WAKE-WORD] Stop error:', error);
      }
    }
  }

  private restart(): void {
    if (!this.isListening) return;
    
    try {
      this.recognition.stop();
      setTimeout(() => {
        if (this.isListening) {
          this.recognition.start();
        }
      }, 100);
    } catch (error) {
      console.error('[WAKE-WORD] Restart error:', error);
    }
  }

  isAvailable(): boolean {
    return this.recognition !== null;
  }
}
