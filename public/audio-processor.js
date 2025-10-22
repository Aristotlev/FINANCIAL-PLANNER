/**
 * AudioWorklet Processor for Real-Time Audio Processing
 * - Captures microphone at 48kHz
 * - Resamples to 16kHz mono
 * - Converts to Int16 PCM
 * - Outputs ~20ms frames (320 samples at 16kHz)
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Configuration
    this.inputSampleRate = 48000; // Browser default
    this.outputSampleRate = 16000; // Required by most ASR systems
    this.frameSize = 320; // 20ms at 16kHz (320 samples)
    
    // Resampling state
    this.resampleBuffer = [];
    this.resampleRatio = this.inputSampleRate / this.outputSampleRate; // 3.0
    this.resamplePhase = 0;
    
    // Output buffer (accumulate until we have a full frame)
    this.outputBuffer = [];
    
    console.log('[AudioProcessor] Initialized');
    console.log(`  Input: ${this.inputSampleRate}Hz → Output: ${this.outputSampleRate}Hz`);
    console.log(`  Frame size: ${this.frameSize} samples (${this.frameSize / this.outputSampleRate * 1000}ms)`);
  }

  /**
   * Process audio samples
   * Called for every 128 samples at input sample rate
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // No input or empty
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    // Get first channel (mono)
    const inputChannel = input[0];
    
    // Resample from 48kHz to 16kHz
    const resampled = this.resample(inputChannel);
    
    // Add to output buffer
    this.outputBuffer.push(...resampled);
    
    // When we have enough samples for a frame, send it
    while (this.outputBuffer.length >= this.frameSize) {
      const frame = this.outputBuffer.splice(0, this.frameSize);
      const pcm16 = this.floatToPCM16(frame);
      
      // Send frame to main thread
      this.port.postMessage({
        type: 'audioFrame',
        data: pcm16,
        sampleRate: this.outputSampleRate,
        frameSize: this.frameSize,
      });
    }
    
    return true; // Keep processor alive
  }

  /**
   * Resample audio from input rate to output rate
   * Uses linear interpolation for quality/performance balance
   */
  resample(inputSamples) {
    const output = [];
    
    for (let i = 0; i < inputSamples.length; i++) {
      this.resampleBuffer.push(inputSamples[i]);
    }
    
    // Process buffered samples
    while (this.resampleBuffer.length >= 2) {
      // Calculate output sample using linear interpolation
      const index = Math.floor(this.resamplePhase);
      const frac = this.resamplePhase - index;
      
      if (index + 1 >= this.resampleBuffer.length) {
        break;
      }
      
      const sample0 = this.resampleBuffer[index];
      const sample1 = this.resampleBuffer[index + 1];
      const interpolated = sample0 + (sample1 - sample0) * frac;
      
      output.push(interpolated);
      
      // Advance phase
      this.resamplePhase += this.resampleRatio;
      
      // Remove consumed samples
      while (this.resamplePhase >= 1.0 && this.resampleBuffer.length > 0) {
        this.resampleBuffer.shift();
        this.resamplePhase -= 1.0;
      }
    }
    
    return output;
  }

  /**
   * Convert Float32 samples to Int16 PCM
   */
  floatToPCM16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1]
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      
      // Convert to 16-bit integer
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    return int16Array;
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);
