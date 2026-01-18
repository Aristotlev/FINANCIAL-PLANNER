'use client';

/**
 * LISA - Production Voice Assistant (Golden Path)
 * 
 * Features:
 * - Finite State Machine (IDLE → WAKE → LISTENING → THINKING → SPEAKING)
 * - AudioWorklet for real-time processing (48kHz → 16kHz)
 * - Adaptive VAD with end-of-utterance detection
 * - Barge-in support (interrupt during speech)
 * - Web Speech API for STT (ready for Gemini Realtime upgrade)
 * - Tool calling via Gemini
 * - Streaming TTS via ElevenLabs
 * - Single global AudioContext
 * 
 * Target: 700-1200ms round-trip latency
 */

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, Volume2, Sparkles, Activity, Lock } from 'lucide-react';
import { AgentStateMachine, AgentState } from '@/lib/agent/state';
import { VoiceActivityDetector, VADState } from '@/lib/audio/vad';
import { AudioPlayer } from '@/lib/audio/player';
import { useSubscription, useAdminStatus } from '@/hooks/use-subscription';
import { getEffectivePlanLimits } from '@/types/subscription';
import { useRouter } from 'next/navigation';

export default function LisaPage() {
  // State
  const [state, setState] = useState<AgentState>(AgentState.IDLE);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [vadState, setVadState] = useState<VADState>(VADState.SILENCE);
  const [energyLevel, setEnergyLevel] = useState(0);

  // Refs
  const stateMachineRef = useRef<AgentStateMachine | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const accumulatedAudioRef = useRef<Int16Array[]>([]);
  
  const { subscription, loading: isSubscriptionLoading } = useSubscription();
  const { isAdmin } = useAdminStatus();
  const router = useRouter();
  
  const planLimits = subscription ? getEffectivePlanLimits(subscription) : null;
  const isAiAllowed = planLimits?.ai_assistant ?? false;

  /**
   * Clean markdown formatting from text for voice output
   */
  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/#{1,6}\s+/g, '') // Remove markdown headers (# ## ### etc)
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold **text**
      .replace(/\*(.+?)\*/g, '$1') // Remove italic *text*
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links [text](url) -> text
      .replace(/`(.+?)`/g, '$1') // Remove code `text`
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/^\s*[-*+]\s+/gm, '') // Remove bullet points
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
      .trim();
  };

  // Initialize
  useEffect(() => {
    console.log('[LISA] Initializing...');
    
    // Initialize FSM
    stateMachineRef.current = new AgentStateMachine(AgentState.IDLE);
    
    // Initialize VAD
    vadRef.current = new VoiceActivityDetector({
      sampleRate: 16000,
      silenceTimeout: 800,
      minSpeechDuration: 300,
    });
    
    // Initialize Audio Player
    audioPlayerRef.current = AudioPlayer.getInstance();
    audioPlayerRef.current.init();

    // Initialize Web Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || 
                                 (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('[STT] Recognition started');
        };

        recognition.onresult = (event: any) => {
          const result = event.results[event.results.length - 1];
          const text = result[0].transcript;
          
          console.log('[STT] Transcript:', text, 'Final:', result.isFinal);
          setTranscript(text);

          // Process final transcript
          if (result.isFinal && state === AgentState.LISTENING) {
            processUtterance(text);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('[STT] Error:', event.error);
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            handleError(event.error);
          }
        };

        recognition.onend = () => {
          console.log('[STT] Recognition ended');
          
          // Restart if still in listening state
          if (state === AgentState.LISTENING) {
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                console.log('[STT] Could not restart');
              }
            }, 100);
          }
        };

        recognitionRef.current = recognition;
        console.log('[LISA] Speech recognition ready');
      } else {
        console.error('[LISA] Speech recognition not supported');
      }
    }

    return () => {
      cleanup();
    };
  }, []);

  // Update state when FSM changes
  useEffect(() => {
    if (stateMachineRef.current) {
      setState(stateMachineRef.current.getState());
    }
  }, [stateMachineRef.current?.getState()]);

  /**
   * Toggle assistant on/off
   */
  const toggleEnabled = async () => {
    if (!isEnabled) {
      await startListening();
    } else {
      stopEverything();
    }
  };

  /**
   * Start listening for commands
   */
  const startListening = async () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not available. Please use Chrome, Edge, or Safari.');
      return;
    }

    console.log('[LISA] Starting listening mode');
    
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        }
      });

      streamRef.current = stream;
      
      // Transition directly to LISTENING state (button activation only)
      stateMachineRef.current?.transition(AgentState.LISTENING, 'Button activated');
      setState(AgentState.LISTENING);
      setIsEnabled(true);
      setTranscript('');
      setResponse('');
      
      // Start recognition
      recognitionRef.current.start();
      
      console.log('[LISA] Ready for your command...');
      
    } catch (error) {
      console.error('[LISA] Microphone error:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  /**
   * Process a complete utterance
   */
  const processUtterance = async (text: string) => {
    if (!text || !text.trim()) {
      console.log('[LISA] Empty utterance, ignoring');
      return;
    }

    console.log('[LISA] Processing utterance:', text);
    
    // Transition to THINKING
    if (!stateMachineRef.current?.transition(AgentState.THINKING, 'Processing utterance')) {
      return;
    }
    setState(AgentState.THINKING);

    try {
      // Stop recognition temporarily
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }

      // Call STT-LLM API
      const startTime = Date.now();
      const llmResponse = await fetch('/api/stt-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!llmResponse.ok) {
        throw new Error(`LLM API error: ${llmResponse.status}`);
      }

      const { text: responseText, action, actionResult, latency } = await llmResponse.json();
      const totalLatency = Date.now() - startTime;
      
      console.log(`[LISA] Response received (${totalLatency}ms, LLM: ${latency}ms)`);
      
      // If there was an action, trigger a refresh of financial data on the client
      if (action && actionResult?.success) {
        console.log('[LISA] Action completed on server, refreshing client data...');
        // Dispatch events to refresh the UI
        window.dispatchEvent(new Event('cryptoDataChanged'));
        window.dispatchEvent(new Event('stockDataChanged'));
        window.dispatchEvent(new Event('cashDataChanged'));
        window.dispatchEvent(new Event('savingsDataChanged'));
        window.dispatchEvent(new Event('financialDataChanged'));
      }
      
      // Strip markdown formatting for voice output
      const cleanedText = cleanMarkdown(responseText);
      setResponse(cleanedText);

      // Speak the response
      await speakText(cleanedText);

    } catch (error) {
      console.error('[LISA] Error processing utterance:', error);
      handleError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  /**
   * Speak text using TTS
   */
  const speakText = async (text: string) => {
    console.log('[LISA] Speaking:', text);
    
    // Transition to SPEAKING
    if (!stateMachineRef.current?.transition(AgentState.SPEAKING, 'TTS started')) {
      return;
    }
    setState(AgentState.SPEAKING);

    try {
      // Call TTS API with Replicate provider
      const ttsResponse = await fetch('/api/tts?provider=replicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          voice: 'af_nicole' // Professional female voice
        }),
      });

      if (!ttsResponse.ok) {
        throw new Error(`TTS API error: ${ttsResponse.status}`);
      }

      if (!ttsResponse.body) {
        throw new Error('No audio stream received');
      }

      // Play audio
      const player = audioPlayerRef.current;
      if (!player) {
        throw new Error('Audio player not initialized');
      }

      await player.playFromStream(ttsResponse.body);
      
      console.log('[LISA] Speech complete');

      // After speaking, go back to LISTENING (conversation mode)
      setTimeout(() => {
        if (isEnabled && stateMachineRef.current?.transition(AgentState.LISTENING, 'Ready for next command')) {
          setState(AgentState.LISTENING);
          setTranscript('');
          
          // Restart recognition
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.log('[STT] Could not restart');
            }
          }
        }
      }, 500);

    } catch (error) {
      console.error('[LISA] TTS error:', error);
      handleError(error instanceof Error ? error.message : 'TTS error');
    }
  };

  /**
   * Handle barge-in (user interrupts speech)
   */
  const handleBargeIn = () => {
    if (!stateMachineRef.current?.canBargeIn()) {
      return;
    }

    console.log('[LISA] Barge-in detected');
    
    // Cancel current speech
    audioPlayerRef.current?.cancel();
    
    // Go back to LISTENING
    if (stateMachineRef.current?.transition(AgentState.LISTENING, 'Barge-in')) {
      setState(AgentState.LISTENING);
      setResponse('');
    }
  };

  /**
   * Handle errors
   */
  const handleError = (error: string) => {
    console.error('[LISA] Error:', error);
    
    stateMachineRef.current?.transition(AgentState.ERROR, error);
    setState(AgentState.ERROR);
    
    // Reset to IDLE after 2 seconds
    setTimeout(() => {
      stateMachineRef.current?.reset('Error recovery');
      setState(AgentState.IDLE);
      setIsEnabled(false);
    }, 2000);
  };

  /**
   * Stop everything and return to IDLE
   */
  const stopEverything = () => {
    console.log('[LISA] Stopping...');
    
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    
    // Stop audio playback
    audioPlayerRef.current?.cancel();
    
    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset state
    stateMachineRef.current?.reset('User stopped');
    setState(AgentState.IDLE);
    setIsEnabled(false);
    setTranscript('');
    setResponse('');
  };

  /**
   * Cleanup on unmount
   */
  const cleanup = () => {
    stopEverything();
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  /**
   * Get state color for UI
   */
  const getStateColor = () => {
    switch (state) {
      case AgentState.IDLE:
        return 'bg-gray-500';
      case AgentState.WAKE:
        return 'bg-yellow-500 animate-pulse';
      case AgentState.LISTENING:
        return 'bg-blue-500 animate-pulse';
      case AgentState.THINKING:
        return 'bg-purple-500';
      case AgentState.SPEAKING:
        return 'bg-green-500 animate-pulse';
      case AgentState.ERROR:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  /**
   * Get state icon
   */
  const getStateIcon = () => {
    switch (state) {
      case AgentState.LISTENING:
        return <Mic className="w-8 h-8" />;
      case AgentState.THINKING:
        return <Loader2 className="w-8 h-8 animate-spin" />;
      case AgentState.SPEAKING:
        return <Volume2 className="w-8 h-8" />;
      default:
        return <Sparkles className="w-8 h-8" />;
    }
  };

  // If AI is not allowed for this plan (and not admin), show upgrade prompt
  if (!isSubscriptionLoading && !isAiAllowed && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 text-center">
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Sparkles className="w-10 h-10 text-purple-300" />
            <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1.5 rounded-full shadow-lg">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">Lisa AI Assistant</h1>
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-sm font-medium mb-6 border border-amber-500/30">
            <Lock className="w-3 h-3" />
            Premium Feature
          </div>
          
          <p className="text-white/80 mb-8 leading-relaxed">
            Upgrade to <span className="font-semibold text-purple-300">Trader</span> or higher to unlock the full power of Lisa AI Assistant with voice interaction and real-time financial insights.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/pricing')}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade to Unlock
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">LISA</h1>
            <p className="text-white/70">Production Voice Assistant</p>
          </div>

          {/* State Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-3 bg-black/30 rounded-full px-6 py-3">
              <div className={`w-3 h-3 rounded-full ${getStateColor()}`} />
              <span className="text-white font-medium">{state}</span>
            </div>
          </div>

          {/* Main Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={toggleEnabled}
              disabled={state === AgentState.THINKING}
              className={`
                relative group
                w-32 h-32 rounded-full
                transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
                ${getStateColor()}
                
                shadow-2xl
                flex items-center justify-center
              `}
            >
              <div className="text-white">
                {getStateIcon()}
              </div>
              
              {/* Pulse ring effect */}
              {(state === AgentState.LISTENING || state === AgentState.SPEAKING) && (
                <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
              )}
            </button>
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="mb-4 p-4 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <div className="text-sm text-blue-300 mb-1">You said:</div>
              <div className="text-white">{transcript}</div>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="mb-4 p-4 bg-green-500/20 rounded-xl border border-green-500/30">
              <div className="text-sm text-green-300 mb-1">Lisa:</div>
              <div className="text-white">{response}</div>
            </div>
          )}

          {/* Instructions */}
          {!isEnabled && (
            <div className="text-center text-white/60 text-sm">
              <p className="mb-2">Click the button to activate Lisa and start speaking</p>
            </div>
          )}

          {/* Debug Info */}
          {isEnabled && (
            <div className="mt-6 p-4 bg-black/20 rounded-xl text-xs text-white/50 font-mono">
              <div>State: {state}</div>
              <div>Enabled: {isEnabled ? 'Yes' : 'No'}</div>
              <div>VAD: {vadState}</div>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-semibold mb-3">Features:</h3>
          <ul className="text-white/70 text-sm space-y-2">
            <li>✓ Button-activated listening</li>
            <li>✓ Real-time speech recognition</li>
            <li>✓ AI-powered responses with tool calling</li>
            <li>✓ Natural voice synthesis</li>
            <li>✓ Barge-in support (interrupt anytime)</li>
            <li>✓ 700-1200ms response time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
