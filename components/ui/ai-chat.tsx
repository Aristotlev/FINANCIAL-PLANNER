"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Minimize2,
  Maximize2,
  Trash2,
  RotateCcw,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Paperclip,
  Image as ImageIcon,
  FileText,
  File,
  XCircle,
  CheckCircle,
  BarChart3,
  Lock,
} from "lucide-react";
import { GeminiService } from "@/lib/gemini-service";
import { TTSPreprocessor } from "@/lib/tts-preprocessor";
import { useSubscription, useAILimit, useAdminStatus } from "@/hooks/use-subscription";
import { getEffectivePlanLimits } from "@/types/subscription";
import { useRouter } from "next/navigation";
import { useBetterAuth } from "@/contexts/better-auth-context";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  marketData?: any;
  charts?: any[];
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  preview?: string;
}

interface AIAction {
  type: string;
  description: string;
  executed: boolean;
}

// Simple markdown formatter for AI messages
function formatMarkdown(text: string): string {
  // Escape HTML to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Convert markdown to HTML
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Code: `code`
  html = html.replace(/`(.+?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

interface AIChatAssistantProps {
  theme?: 'default' | 'portfolio';
}

export function AIChatAssistant({ theme = 'default' }: AIChatAssistantProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { subscription, loading: isSubscriptionLoading } = useSubscription();
  const { checkLimit, recordCall, callsRemaining, limitInfo } = useAILimit();
  const { isAdmin } = useAdminStatus();
  const router = useRouter();
  const { user } = useBetterAuth();
  
  // Theme-based styling
  const themeStyles = {
    default: {
      button: 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg hover:shadow-xl',
      header: 'bg-gradient-to-r from-purple-600 to-blue-600 border-b border-white/10',
      accentColor: 'bg-green-500',
      accentPulse: 'bg-green-400',
    },
    portfolio: {
      button: 'bg-black border border-cyan-500/20 hover:border-cyan-500/60 shadow-[0_0_20px_-5px_rgba(6,182,212,0.15)] hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.4)]',
      header: 'bg-black border-b border-cyan-500/20',
      accentColor: 'bg-cyan-500',
      accentPulse: 'bg-cyan-400',
    },
  };
  
  const currentTheme = themeStyles[theme];
  
  const planLimits = subscription ? getEffectivePlanLimits(subscription) : null;
  const isAiAllowed = planLimits?.ai_assistant ?? false;
  // isAdmin comes from useAdminStatus() hook above
  const [adminBypass, setAdminBypass] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 **I'm Omni**, your AI financial expert.\n\n**I can help you with:**\n• 📊 Deep Portfolio Analysis\n• 📈 Real-time Market Data\n• � Smart Investment Insights\n• 🌍 Global Market Sentiment\n\n**�️ Voice Mode:**\nTap 🎙️ to speak or 🔊 to hear me.\n\n**Try asking:**\n\"Analyze BTC\", \"Compare AAPL vs MSFT\", or \"Check my portfolio status\".",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    // Voice starts DISABLED by default - user must explicitly enable it
    // This prevents unwanted TTS API calls and voice responses
    return false;
  });
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [geminiService] = useState(() => new GeminiService());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sendMessageRef = useRef<() => Promise<void>>();
  const isListeningRef = useRef<boolean>(false); // Track listening state to avoid closure issues

  // Load financial context when chat opens
  // Also refresh data periodically (every 2 minutes)
  useEffect(() => {
    if (isOpen && (isAiAllowed || isAdmin)) {
      // Initial load
      geminiService.loadFinancialContext().catch(console.error);
      
      // Don't auto-request microphone - only request when user clicks mic button
      // This avoids "Permission denied" errors and browser blocking
      
      // Set up periodic refresh (every 2 minutes)
      const refreshInterval = setInterval(() => {
        geminiService.loadFinancialContext().catch(console.error);
      }, 120000); // 2 minutes
      
      // Cleanup interval on unmount
      return () => clearInterval(refreshInterval);
    }
  }, [isOpen, geminiService, isAiAllowed]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        return;
      }

      // Speech recognition for voice commands
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // FALSE - we want it to stop after each phrase
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 3; // More alternatives for better accuracy

      recognition.onstart = () => {
        setIsListening(true);
        isListeningRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Get all results - separate final from interim
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update input with final + interim
        const fullTranscript = (finalTranscript + interimTranscript).trim();
        
        // Update BOTH state and ref immediately
        setInput(fullTranscript);
        if (inputRef.current) {
          inputRef.current.value = fullTranscript;
        }
      };

      recognition.onerror = (event: any) => {
        const errorType = event.error as string;
        
        // Ignore no-speech and aborted errors (these are normal)
        if (errorType === 'no-speech' || errorType === 'aborted' || errorType === 'network') {
          return;
        }
        
        // Critical errors only
        console.error('❌ MIC ERROR:', errorType);
        setIsListening(false);
        isListeningRef.current = false;
        
        // Show helpful error messages for actual critical errors
        if (errorType === 'not-allowed') {
          alert('🎤 Microphone blocked - Click the 🔒 in address bar to allow');
        } else if (errorType === 'audio-capture') {
          alert('🎤 No microphone found - Check system settings');
        }
      };

      recognition.onend = () => {
        const currentInput = inputRef.current?.value || '';
        
        setIsListening(false);
        isListeningRef.current = false;
        
        if (currentInput.trim()) {
          // Auto-send the message!
          setTimeout(() => {
            if (sendMessageRef.current) {
              sendMessageRef.current();
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;

      // Initialize Speech Synthesis
      if (window.speechSynthesis) {
        synthRef.current = window.speechSynthesis;
      }
    }

    return () => {
      // Cleanup: ensure everything stops
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          recognitionRef.current = null;
        } catch (e) {
          console.log("Recognition cleanup:", e);
        }
      }
      if (synthRef.current) {
        synthRef.current.cancel();
        synthRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // Stop everything when chat closes
  useEffect(() => {
    if (!isOpen || isMinimized) {
      stopSpeaking();
      stopListening();
    }
  }, [isOpen, isMinimized]);

  // Request microphone permission explicitly
  const requestMicrophonePermission = async (): Promise<boolean> => {
    setCheckingPermission(true);
    
    try {
      // Check if we're on Brave browser
      const isBrave = (navigator as any).brave && await (navigator as any).brave.isBrave?.();
      if (isBrave) {
        console.log('🦁 [Brave] Browser detected - using compatible microphone request');
      }
      
      // For Brave, check permissions API first
      if (isBrave && navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('🎤 [Brave] Microphone permission status:', permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            setCheckingPermission(false);
            setMicPermissionGranted(false);
            alert('🦁 Brave Browser: Microphone Blocked\n\nTo enable microphone in Brave:\n\n1. Click the 🦁 Shields icon (or 🔒) in the address bar\n2. Click "Advanced View" or "Site settings"\n3. Find "Microphone" and change to "Allow"\n4. Refresh the page\n5. Try the microphone button again');
            return false;
          }
        } catch (e) {
          console.log('⚠️ [Brave] Permissions API check failed, continuing with getUserMedia');
        }
      }
      
      // Request microphone access using getUserMedia
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Stop the stream immediately (we just needed permission)
      stream.getTracks().forEach(track => track.stop());
      
      setMicPermissionGranted(true);
      setCheckingPermission(false);
      console.log('✅ Microphone permission granted');
      return true;
    } catch (error: any) {
      setCheckingPermission(false);
      setMicPermissionGranted(false);
      
      // Only show alerts when user explicitly clicked the mic button (not on auto-check)
      // The error.name check determines if we should show UI feedback
      const showAlert = error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError';
      
      // Log as warning instead of error to avoid error interceptors
      console.warn('🎤 Microphone permission not granted:', error.name);
      
      // Check if Brave browser for custom message
      const isBrave = (navigator as any).brave !== undefined;
      
      if (showAlert && error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        if (isBrave) {
          alert('🦁 Brave Browser: Microphone Access Blocked\n\nBrave has stricter privacy settings. To enable:\n\n1. Click the 🦁 Shields icon in address bar\n2. Click "Advanced View" or "Site settings"\n3. Scroll to "Microphone"\n4. Change from "Block" to "Allow"\n5. Refresh the page (F5)\n6. Try microphone again\n\nAlternative: Use Chrome if issues persist.');
        } else {
          alert('🎤 Microphone Access Required\n\nTo use voice input, please:\n\n1. Click the 🔒 or 🎤 icon in your browser\'s address bar\n2. Select "Allow" for microphone access\n3. Click the microphone button again\n\nNote: You only need to do this once!');
        }
      } else if (error.name === 'NotFoundError') {
        alert('🎤 No Microphone Found\n\nPlease ensure:\n\n• A microphone is connected to your device\n• It\'s properly configured in system settings\n• It\'s not being used by another application');
      } else {
        const braveNote = isBrave ? '\n\n⚠️ Note: You\'re using Brave browser which has strict privacy settings. Consider using Chrome if microphone issues persist.' : '';
        alert(`⚠️ Microphone Error\n\nCouldn\'t access microphone: ${error.message}\n\nPlease check your device settings and try again.${braveNote}`);
      }
      
      return false;
    }
  };

  const startListening = async () => {
    if (!recognitionRef.current) {
      const isBrave = (navigator as any).brave !== undefined;
      const browserNote = isBrave ? '\n\nNote: Brave browser may have stricter settings. Try Chrome if issues persist.' : '';
      alert('Speech recognition not available in this browser' + browserNote);
      return;
    }
    
    if (isListening) return;
    
    // Always re-request permission for Brave browser
    const isBrave = (navigator as any).brave !== undefined;
    if (isBrave || !micPermissionGranted) {
      console.log('🎤 Requesting microphone permission...');
      const granted = await requestMicrophonePermission();
      if (!granted) {
        console.error('❌ Microphone permission denied');
        return;
      }
    }
    
    // Clear input before starting
    setInput('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    
    try {
      console.log('🎤 Starting speech recognition...');
      recognitionRef.current.start();
      setIsListening(true);
      isListeningRef.current = true;
      console.log('✅ Speech recognition started');
    } catch (error: any) {
      if (error.message?.includes('already started')) {
        console.log('⚠️ Recognition already started');
        setIsListening(true);
        isListeningRef.current = true;
      } else {
        console.error('❌ Mic start failed:', error.message);
        setIsListening(false);
        isListeningRef.current = false;
        
        // Show Brave-specific error message
        if (isBrave) {
          alert('🦁 Brave Browser: Microphone Start Failed\n\nTry these steps:\n\n1. Close and reopen this chat window\n2. Click the 🦁 Shields icon\n3. Check microphone is set to "Allow"\n4. Refresh the entire page (F5)\n5. Try again\n\nIf still not working, use Chrome browser.');
        }
      }
    }
  };

  const stopListening = () => {
    setIsListening(false);
    isListeningRef.current = false;
    
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
    } catch (error: any) {
      // Ignore stop errors
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  };

  // Normalize text for natural TTS pronunciation
  const normalizeTextForTTS = (text: string): string => {
    let normalized = text;

    // Remove markdown formatting
    normalized = normalized.replace(/\*\*/g, '');
    normalized = normalized.replace(/\*/g, '');
    normalized = normalized.replace(/`/g, '');
    normalized = normalized.replace(/_{1,2}/g, '');
    normalized = normalized.replace(/~/g, '');
    normalized = normalized.replace(/━+/g, '');
    normalized = normalized.replace(/•/g, '');
    
    // Remove ALL emojis
    normalized = normalized.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
    normalized = normalized.replace(/[\u2600-\u27BF]/g, '');
    normalized = normalized.replace(/[\uFE00-\uFE0F]/g, '');
    normalized = normalized.replace(/[\u203C-\u3299]/g, '');

    // Time periods: 24h -> "twenty four hours", 7d -> "seven days", etc.
    normalized = normalized.replace(/(\d+)h\b/gi, (match, num) => `${num} hours`);
    normalized = normalized.replace(/(\d+)d\b/gi, (match, num) => `${num} days`);
    normalized = normalized.replace(/(\d+)w\b/gi, (match, num) => `${num} weeks`);
    normalized = normalized.replace(/(\d+)m\b(?!s)/gi, (match, num) => `${num} months`);
    normalized = normalized.replace(/(\d+)y\b/gi, (match, num) => `${num} years`);
    normalized = normalized.replace(/(\d+)min\b/gi, (match, num) => `${num} minutes`);
    normalized = normalized.replace(/(\d+)s\b/gi, (match, num) => `${num} seconds`);

    // Percentages with decimals: +24.66% -> "up twenty four point six six percent"
    normalized = normalized.replace(/\+(\d+)\.(\d+)%/g, (match, whole, decimal) => {
      const decimalSpaced = decimal.split('').join(' ');
      return `up ${whole} point ${decimalSpaced} percent`;
    });
    normalized = normalized.replace(/-(\d+)\.(\d+)%/g, (match, whole, decimal) => {
      const decimalSpaced = decimal.split('').join(' ');
      return `down ${whole} point ${decimalSpaced} percent`;
    });
    normalized = normalized.replace(/\+(\d+)%/g, (match, num) => `up ${num} percent`);
    normalized = normalized.replace(/-(\d+)%/g, (match, num) => `down ${num} percent`);
    normalized = normalized.replace(/(\d+)\.(\d+)%/g, (match, whole, decimal) => {
      const decimalSpaced = decimal.split('').join(' ');
      return `${whole} point ${decimalSpaced} percent`;
    });
    normalized = normalized.replace(/(\d+)%/g, (match, num) => `${num} percent`);

    // Currency amounts: $1,234.56 -> "one thousand two hundred thirty four dollars and fifty six cents"
    normalized = normalized.replace(/\$(\d{1,3}(,\d{3})*)\.(\d{2})/g, (match, dollars, _, cents) => {
      const dollarNum = dollars.replace(/,/g, '');
      return `$${dollarNum} and ${cents} cents`;
    });
    normalized = normalized.replace(/\$(\d{1,3}(,\d{3})*)/g, (match, dollars) => {
      return `$${dollars.replace(/,/g, '')}`;
    });

    // Large numbers with K/M/B suffixes
    normalized = normalized.replace(/\$(\d+\.?\d*)([KMB])\b/gi, (match, num, suffix) => {
      const suffixMap: Record<string, string> = { 'K': 'thousand', 'M': 'million', 'B': 'billion' };
      return `${num} ${suffixMap[suffix.toUpperCase()]} dollars`;
    });

    // Stock symbols in context: "AAPL is trading" -> "Apple is trading"
    const symbolMap: Record<string, string> = {
      'AAPL': 'Apple',
      'MSFT': 'Microsoft',
      'GOOGL': 'Google',
      'GOOG': 'Google',
      'AMZN': 'Amazon',
      'TSLA': 'Tesla',
      'NVDA': 'NVIDIA',
      'META': 'Meta',
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'USDT': 'Tether',
      'USDC': 'U.S.D.C.',
      'BNB': 'Binance Coin',
      'XRP': 'Ripple',
      'ADA': 'Cardano',
      'DOGE': 'Dogecoin',
      'SOL': 'Solana',
      'DOT': 'Polkadot',
    };

    // Financial acronyms
    const acronymMap: Record<string, string> = {
      'P/L': 'profit and loss',
      'P&L': 'profit and loss',
      'YTD': 'year to date',
      'EUR': 'Euro',
      'USD': 'U.S. Dollar',
      'GBP': 'British Pound',
      'JPY': 'Japanese Yen',
      'RSI': 'R.S.I.',
      'MACD': 'M.A.C.D.',
      'GDP': 'G.D.P.',
      'VIX': 'V.I.X.',
      'S&P': 'S and P',
      'NYSE': 'New York Stock Exchange',
      'NASDAQ': 'NASDAQ',
    };

    // Replace symbols and acronyms
    Object.entries(symbolMap).forEach(([symbol, name]) => {
      const regex = new RegExp(`\\b${symbol}\\b`, 'g');
      normalized = normalized.replace(regex, name);
    });

    Object.entries(acronymMap).forEach(([acronym, expansion]) => {
      const regex = new RegExp(`\\b${acronym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      normalized = normalized.replace(regex, expansion);
    });

    return normalized;
  };

  // Replicate TTS API integration using Kokoro model
  const speakWithReplicate = async (text: string): Promise<void> => {
    // 🚨 CRITICAL SAFETY CHECK: Don't make TTS API call if voice is disabled
    if (!voiceEnabled) {
      console.log('🔇 [Replicate] Voice disabled - aborting TTS API call');
      return;
    }
    
    try {
      console.log('🎙️ [Replicate] Starting TTS request...');
      
      // 🚀 FAST PATH: Use quick preprocessing (text already cleaned by speakText)
      // Just do final cleanup
      let cleanedText = text.replace(/\n\n+/g, '. ');
      cleanedText = cleanedText.replace(/\n/g, ' ');
      cleanedText = cleanedText.replace(/\s+/g, ' ');
      cleanedText = cleanedText.trim();
      
      console.log('🎙️ [Replicate] Text ready for TTS (length:', cleanedText.length, ')');
      console.log('🎙️ [Replicate] Sample:', cleanedText.substring(0, 100) + '...');
      
      // Detect Brave browser
      const isBrave = (navigator as any).brave && await (navigator as any).brave.isBrave?.();
      if (isBrave) {
        console.log('🦁 [Brave] Browser detected - using compatible mode');
      }
      
      setIsSpeaking(true);
      
      // Call our API route with Replicate and af_nicole voice (HARDCODED)
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: cleanedText,
          voice: 'af_nicole' // Professional female voice - HARDCODED
        }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ [Replicate] API error:', errorData);
        throw new Error(errorData.error || 'TTS API failed');
      }

      console.log('✅ [Replicate] Response received, creating audio...');
      
      // Get audio blob from response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and setup audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Enhanced audio settings
      audio.volume = 1.0;
      audio.playbackRate = 1.0;
      
      audio.onloadeddata = () => {
        console.log('✅ [Replicate] Audio loaded, duration:', audio.duration, 'seconds');
      };
      
      audio.onplay = () => {
        console.log('▶️ [Replicate] Audio playback started');
      };
      
      audio.onended = () => {
        console.log('✅ [Replicate] Audio playback completed');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      
      audio.onerror = (e) => {
        console.error('❌ [Replicate] Audio playback error:', e);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      
      // Brave browser requires user interaction for audio playback
      // Try to play, and if it fails, throw to fallback
      try {
        await audio.play();
        console.log('✅ [Replicate] Audio play() called successfully');
      } catch (playError: any) {
        console.warn('⚠️ [Replicate] Auto-play blocked (likely Brave):', playError.message);
        // Clean up and throw to trigger fallback
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        throw new Error('Audio playback blocked by browser');
      }
    } catch (error) {
      console.error('❌ [Replicate] TTS failed:', error);
      setIsSpeaking(false);
      throw error;
    }
  };

  const speakText = async (text: string) => {
    console.log('🔊 [SPEAK] Text length:', text.length);
    console.log('🔊 [SPEAK] Voice enabled:', voiceEnabled);
    console.log('🔊 [SPEAK] Currently speaking:', isSpeaking);
        
    // 🚨 CRITICAL: Voice is OFF - no API calls, no speaking, return immediately
    if (!voiceEnabled) {
      console.log('🔇 [SPEAK] Voice DISABLED - skipping all TTS (no API calls)');
      return;
    }
    
    console.log('🔊 [SPEAK] Voice ENABLED - proceeding with TTS');

    // Stop any ongoing speech first
    if (isSpeaking) {
      console.log('🛑 [SPEAK] Stopping current speech before starting new one');
      stopSpeaking();
    }

    // 🤖 SMART PATH: Use Gemini AI for professional financial speech conversion
    console.log('🤖 [SPEAK] Using Gemini AI for professional TTS preprocessing...');
    let cleanText: string;
    
    try {
      // Use AI-powered preprocessing for best quality (handles vertical bars, financial terms, etc.)
      cleanText = await TTSPreprocessor.preprocessForTTS(text);
      console.log('✅ [SPEAK] Gemini preprocessing complete');
    } catch (error) {
      console.warn('⚠️ [SPEAK] Gemini preprocessing failed, using quick fallback:', error);
      // Fallback to quick rule-based preprocessing
      cleanText = TTSPreprocessor.quickPreprocess(text);
    }
    
    console.log('🎙️ [SPEAK] Clean text length:', cleanText.length);
    console.log('🎙️ [SPEAK] Clean text preview:', cleanText.substring(0, 150) + '...');

    if (!cleanText || cleanText.length === 0) {
      console.log('⚠️ [SPEAK] No text to speak after cleaning');
      return;
    }

    // Use Replicate TTS (Kokoro model with Nicole voice)
    try {
      console.log('🎙️ [SPEAK] Using Replicate TTS...');
      await speakWithReplicate(cleanText);
      console.log('✅ [SPEAK] Replicate speech completed successfully');
    } catch (error) {
      console.error('❌ [SPEAK] Replicate failed, falling back to browser TTS:', error);
      
      // Only fallback if it's a critical error, not just audio blocked
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('blocked') || errorMessage.includes('interaction')) {
        setIsSpeaking(false);
        return; // Don't fallback to browser TTS
      }
      
      // Fallback to browser TTS
      await speakWithBrowserTTS(cleanText);
    }
  };

  // Browser TTS helper function
  const speakWithBrowserTTS = async (cleanText: string) => {
      // 🚨 CRITICAL SAFETY CHECK: Don't speak if voice is disabled
      if (!voiceEnabled) {
        console.log('🔇 [BrowserTTS] Voice disabled - aborting browser TTS');
        return;
      }
      
      // Fallback to enhanced browser speech synthesis
      if (!synthRef.current) {
        console.error('❌ [SPEAK] No speech synthesis available');
        return;
      }
      
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.85; // Slightly slower for better clarity and pronunciation
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Enhanced voice selection with better priorities
      const voices = synthRef.current.getVoices();
      console.log('🎙️ [SPEAK] Available voices:', voices.length);
      
      const preferredVoice =
        voices.find((voice) => voice.name.includes("Daniel")) ||
        voices.find((voice) => voice.name.includes("Samantha")) ||
        voices.find((voice) => voice.name.includes("Google UK English Male")) ||
        voices.find((voice) => voice.name.includes("Alex")) ||
        voices.find((voice) => voice.lang === "en-US" && voice.name.includes("Enhanced")) ||
        voices.find((voice) => voice.lang === "en-US") ||
        voices.find((voice) => voice.lang.startsWith("en")) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log('🎙️ [SPEAK] Using voice:', preferredVoice.name);
      }

      utterance.onstart = () => {
        console.log('▶️ [SPEAK] Browser speech started');
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log('✅ [SPEAK] Browser speech completed');
        setIsSpeaking(false);
      };

      utterance.onerror = (e) => {
        console.error('❌ [SPEAK] Browser speech error:', e);
        setIsSpeaking(false);
      };

      console.log('🎙️ [SPEAK] Starting browser speech...');
      synthRef.current.speak(utterance);
      console.log('✅ [SPEAK] Browser speech queued');
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsSpeaking(false);
    }
  };

  const toggleVoice = () => {
    const newValue = !voiceEnabled;
    console.log('🔊 [TOGGLE] ===== VOICE TOGGLE CLICKED =====');
    console.log('🔊 [TOGGLE] Current state:', voiceEnabled);
    console.log('🔊 [TOGGLE] New state:', newValue);
    
    setVoiceEnabled(newValue);
    
    if (!newValue) {
      // Voice is now OFF - stop everything voice-related
      console.log('🔇 [TOGGLE] Voice DISABLED - stopping all speech and preventing future TTS calls');
      stopSpeaking();
      
      // Add a message to chat to confirm
      const confirmMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: '🔇 Voice responses disabled. I\'ll continue to respond in text only.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMessage]);
    } else {
      // Voice is now ON
      console.log('� [TOGGLE] Voice ENABLED - TTS will now work for all responses');
      
      // Add a message to chat to confirm
      const confirmMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: '🔊 Voice responses enabled. I\'ll now speak my responses using premium AI voice.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMessage]);
    }
    
    // Show visual confirmation
    const message = newValue ? '🔊 Voice responses ENABLED' : '🔇 Voice responses DISABLED';
    console.log('✅ [TOGGLE]', message);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    const newAttachments: FileAttachment[] = [];

    for (const file of files) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
      ];

      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not supported.`);
        continue;
      }

      // Create object URL for preview
      const url = URL.createObjectURL(file);
      let preview: string | undefined;

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        preview = url;
      }

      const attachment: FileAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        url,
        preview,
      };

      newAttachments.push(attachment);
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type === 'application/pdf') return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsProcessing(true);
    try {
      const result = await geminiService.executeAction(pendingAction);
      
      const resultMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, resultMessage]);
      setPendingAction(null);

      // Reload financial context after action
      await geminiService.loadFinancialContext();

      if (voiceEnabled) {
        speakText(result.message);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Something went wrong. Please try again or rephrase your request.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    const cancelMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "👍 Got it! Action cancelled. What else can I help you with?",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, cancelMessage]);
  };

  const handleSendMessage = async () => {
    const messageText = input.trim();
    console.log('📤 === SENDING MESSAGE ===');
    console.log('📤 Message text:', messageText);
    
    if ((!messageText && attachments.length === 0) || isProcessing) {
      console.log('⚠️ Cannot send - empty or processing');
      return;
    }

    // Check AI usage limits
    const canProceed = isAdmin || await checkLimit();
    if (!canProceed) {
      const limitMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `🚫 **Daily Limit Reached**\n\nYou've used all your AI messages for today. Upgrade your plan for more capacity!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, limitMessage]);
      return;
    }

    const userInput = messageText;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userInput || "[Sent attachments]",
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    console.log('✅ Adding user message to chat');
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachments([]);
    setIsProcessing(true);

    // Stop listening when sending
    console.log('🛑 Stopping microphone...');
    stopListening();

    try {
      // Handle file attachments
      if (userMessage.attachments && userMessage.attachments.length > 0) {
        const fileList = userMessage.attachments.map(a => a.name).join(', ');
        const fileCount = userMessage.attachments.length;
        const imageCount = userMessage.attachments.filter(a => a.type.startsWith('image/')).length;
        const docCount = fileCount - imageCount;

        let ackMessage = `📎 I've received ${fileCount} file${fileCount > 1 ? 's' : ''}: ${fileList}\n\n`;

        if (imageCount > 0) {
          ackMessage += `📸 I can see ${imageCount} image${imageCount > 1 ? 's' : ''}. `;
        }
        if (docCount > 0) {
          ackMessage += `📄 I have ${docCount} document${docCount > 1 ? 's' : ''} to review. `;
        }

        ackMessage += `\n\nI can help you with:\n• Extracting financial data from documents\n• Analyzing receipts and invoices\n• Processing bank statements\n• Reading transaction details\n• Identifying items in photos\n\nWhat would you like me to do with ${fileCount > 1 ? 'these files' : 'this file'}?`;

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: ackMessage,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsProcessing(false);

        if (voiceEnabled) {
          speakText(ackMessage);
        }
        return;
      }

      // Process message with Gemini
      const aiResponse = await geminiService.processMessage(userInput);

      // Record successful AI call
      await recordCall();

      // Show text message immediately
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: aiResponse.text,
        timestamp: new Date(),
        marketData: aiResponse.marketData,
        charts: aiResponse.charts,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // 🎙️ START TTS IMMEDIATELY with perfect voice quality
      if (voiceEnabled && aiResponse.text) {
        console.log('🎙️ [TTS] ===== STARTING VOICE IMMEDIATELY =====');
        console.log('🎙️ [TTS] Voice Enabled:', voiceEnabled);
        console.log('🎙️ [TTS] Text length:', aiResponse.text.length);
        
        // Start speaking immediately with Gemini AI preprocessing
        speakText(aiResponse.text).catch(err => {
          console.error('❌ [TTS] Speech failed:', err);
        });
      }

      // If there's an action that needs confirmation
      if (aiResponse.action && aiResponse.needsConfirmation) {
        setPendingAction(aiResponse.action);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I apologize, but I'm having trouble processing that request. Could you try rephrasing it?",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      setIsProcessing(false);
    }
  };

  // Store ref for use in recognition callbacks
  sendMessageRef.current = handleSendMessage;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    stopSpeaking();
    setPendingAction(null);
    geminiService.clearContext();
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Chat cleared! I'm ready to help you manage your finances. What would you like to do?",
        timestamp: new Date(),
      },
    ]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[1000000] p-4 ${currentTheme.button} text-white rounded-full transition-all group`}
        title="Open AI Assistant"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className={`absolute -top-1 -right-1 w-3 h-3 ${currentTheme.accentColor} rounded-full animate-pulse`}></span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[1000000]">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2 px-4 py-3 ${currentTheme.button} text-white rounded-full transition-all`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">AI Assistant</span>
          <span className={`w-2 h-2 ${currentTheme.accentPulse} rounded-full animate-pulse`}></span>
        </button>
      </div>
    );
  }

  // If AI is not allowed for this plan, show upgrade prompt inside the chat with blurred background
  // For admins, show the restriction initially but allow bypass
  if (!isSubscriptionLoading && !isAiAllowed && !(isAdmin && adminBypass)) {
    return (
      <>
      <style dangerouslySetInnerHTML={{ __html: `
        .markdown-content strong {
          font-weight: 600;
          color: inherit;
        }
        .markdown-content em {
          font-style: italic;
        }
        .markdown-content code {
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
      `}} />
      <div className="fixed bottom-6 right-6 z-[1000000] flex flex-col w-[450px] h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header - Normal style */}
        <div className={`flex items-center justify-between p-4 ${currentTheme.header} text-white rounded-t-2xl`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Omni AI Assistant
              </h3>
              <p className="text-xs text-purple-100">🔇 Voice: OFF</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Enable voice responses (CURRENTLY OFF)"
            >
              <VolumeX className="w-4 h-4" />
            </button>
            <button
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Clear chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </button>
          </div>
        </div>

        {/* Chat Content Area - Blurred with Overlay */}
        <div className="flex-1 relative overflow-hidden">
          {/* Blurred Background Content - Real Welcome Message */}
          <div className="absolute inset-0 p-4 space-y-4 blur-[4px] opacity-60 pointer-events-none select-none overflow-y-auto">
             <div className="flex justify-start">
                <div className="w-full rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">AI Assistant</span>
                    </div>
                    <div 
                        className="text-sm whitespace-pre-line dark:text-white leading-relaxed markdown-content"
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(messages[0].content) }}
                    />
                    <p className="text-xs opacity-60 mt-1 dark:text-white">
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
             </div>
          </div>

          {/* Centered Upgrade Card */}
          <div 
            className={`absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-black/40 backdrop-blur-[2px] z-10 ${isAdmin ? 'cursor-pointer' : ''}`}
            onClick={() => isAdmin && setAdminBypass(true)}
          >
            <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 mx-4 max-w-[320px]">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Upgrade to Chat with Omni</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                Unlock AI-powered financial insights, market analysis, and voice interaction.
              </p>
              <a
                href="/pricing"
                onClick={(e) => {
                  e.preventDefault();
                  if (isAdmin) {
                    setAdminBypass(true);
                  } else {
                    setIsOpen(false);
                    router.push('/pricing');
                  }
                }}
                className="inline-flex items-center justify-center w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-purple-500/25"
              >
                View Upgrade Options
              </a>
            </div>
          </div>
        </div>

        {/* Blurred Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 blur-[2px] pointer-events-none select-none">
          <div className="flex gap-2">
            <button className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-xl">
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                placeholder="Type or speak your command..."
                disabled
                className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-400 resize-none"
                rows={2}
              />
              <button className="absolute right-2 top-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-400">
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl opacity-50">
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-300">
              💡 Drag & drop files or click 📎 to attach
            </p>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .markdown-content strong {
          font-weight: 600;
          color: inherit;
        }
        .markdown-content em {
          font-style: italic;
        }
        .markdown-content code {
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
      `}} />
      
    <div className="fixed bottom-6 right-6 z-[1000000] flex flex-col w-[450px] h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className={`flex items-center justify-between p-4 ${currentTheme.header} text-white rounded-t-2xl`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Omni AI Assistant
              {isListening && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  Listening
                </span>
              )}
              {isSpeaking && (
                <span className="inline-flex items-center gap-1 text-xs bg-purple-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></span>
                  Speaking
                </span>
              )}
            </h3>
            <p className="text-xs text-purple-100">
              {isSpeaking 
                ? '🔊 Speaking...' 
                : voiceEnabled 
                  ? '✅ Voice: ON' 
                  : '🔇 Voice: OFF'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleVoice}
            className={`p-2 hover:bg-white/20 rounded-lg transition-colors ${
              voiceEnabled ? 'bg-white/10' : ''
            }`}
            title={voiceEnabled ? "Disable voice responses (CURRENTLY ON)" : "Enable voice responses (CURRENTLY OFF)"}
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={clearChat}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Clear chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`w-full rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    AI Assistant
                  </span>
                  {isSpeaking && (
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-3 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse"></div>
                      <div
                        className="w-1 h-4 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-1 h-3 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
              <div 
                className="text-sm whitespace-pre-line dark:text-white leading-relaxed markdown-content"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
              />
              
              {/* Display Market Data Charts */}
              {message.charts && message.charts.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.charts.map((chart, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                          {chart.title}
                        </span>
                      </div>
                      {chart.embedUrl && (
                        <div className="bg-white dark:bg-gray-800 rounded p-2">
                          <a
                            href={chart.embedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <span>📊 View Interactive Chart on TradingView</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Display Market Data Sources */}
              {message.marketData?.sources && message.marketData.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.marketData.sources.map((source: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium"
                    >
                      <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                      {source}
                    </span>
                  ))}
                </div>
              )}
              
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="bg-white/10 dark:bg-black/20 rounded-lg p-2"
                    >
                      {attachment.preview ? (
                        <img
                          src={attachment.preview}
                          alt={attachment.name}
                          className="w-full h-32 object-cover rounded-lg mb-1"
                        />
                      ) : null}
                      <div className="flex items-center gap-2 text-xs">
                        {getFileIcon(attachment.type)}
                        <span className="flex-1 truncate">{attachment.name}</span>
                        <span className="opacity-70">{formatFileSize(attachment.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs opacity-60 mt-1 dark:text-white">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-300">
                  AI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}
        {pendingAction && !isProcessing && (
          <div className="flex justify-center">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 w-full">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Ready to execute
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-200 mb-3">
                Should I proceed with this action?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmAction}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Yes, do it
                </button>
                <button
                  onClick={handleCancelAction}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="p-4 border-t border-gray-200 dark:border-gray-700"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-purple-500/20 border-2 border-dashed border-purple-500 rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <Paperclip className="w-12 h-12 mx-auto mb-2 text-purple-600" />
              <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                Drop files here
              </p>
              <p className="text-sm text-purple-500 dark:text-purple-300">
                Images, PDFs, and documents
              </p>
            </div>
          </div>
        )}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group bg-gray-100 dark:bg-gray-800 rounded-lg p-2 flex items-center gap-2 max-w-[180px]"
              >
                {attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    {getFileIcon(attachment.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate dark:text-white">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach files"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isListening
                  ? "Listening... Speak now"
                  : "Type or speak your command..."
              }
              className={`w-full px-4 py-2 pr-12 border ${
                isListening
                  ? "border-red-500 ring-2 ring-red-300 dark:ring-red-700"
                  : "border-gray-300 dark:border-gray-600"
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 placeholder-gray-500 resize-none transition-all`}
              rows={2}
              disabled={isProcessing}
            />
            <button
              onClick={toggleListening}
              disabled={isProcessing || checkingPermission}
              className={`absolute right-2 top-2 p-2 rounded-lg transition-all shadow-sm ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg shadow-red-500/50"
                  : checkingPermission
                  ? "bg-yellow-500 text-white"
                  : micPermissionGranted
                  ? "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/40 text-green-700 dark:text-green-300"
                  : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={
                checkingPermission
                  ? "Requesting microphone permission..."
                  : isListening
                  ? "🔴 RECORDING - Click to stop & send"
                  : micPermissionGranted
                  ? "🎤 Click to start recording"
                  : "Click to grant microphone access"
              }
            >
              {checkingPermission ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isListening ? (
                <div className="relative">
                  <MicOff className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></span>
                </div>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>
          <button
            data-send-button
            onClick={handleSendMessage}
            disabled={(!input.trim() && attachments.length === 0) || isProcessing}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-300">
            💡 Drag & drop files or click 📎 to attach
          </p>
          {isListening && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-500 font-medium">
                Recording...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
