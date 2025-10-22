/**
 * STT + LLM API Route with Function Calling
 * Handles: text → Gemini (with tools) → tool execution → final response
 * Prepared for future Gemini Realtime upgrade
 */

import { NextRequest, NextResponse } from "next/server";
import { GeminiService } from "@/lib/gemini-service";

const geminiService = new GeminiService();

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
    result?: any;
  }>;
}

interface STTLLMRequest {
  text: string;
  conversationHistory?: ChatMessage[];
}

/**
 * Generate response using Gemini service
 */
async function generateWithGemini(
  text: string, 
  conversationHistory: ChatMessage[] = []
): Promise<{
  text?: string;
}> {
  console.log('[STT-LLM] Generating response with Gemini service...');

  try {
    // Use the gemini service directly
    const response = await geminiService.processMessage(text);

    console.log('[STT-LLM] Response generated:', response.text.substring(0, 100));
    
    // 🔧 FIX: Execute action if one was detected
    if (response.action) {
      console.log('[STT-LLM] Action detected:', response.action.type);
      console.log('[STT-LLM] Action data:', JSON.stringify(response.action.data, null, 2));
      
      try {
        const actionResult = await geminiService.executeAction(response.action);
        console.log('[STT-LLM] Action executed:', actionResult.success);
        
        // Return the action result message instead of the AI's text
        return { text: actionResult.message };
      } catch (actionError) {
        console.error('[STT-LLM] Action execution failed:', actionError);
        return { 
          text: `❌ I understood you want to ${response.action.type}, but something went wrong: ${actionError instanceof Error ? actionError.message : 'Unknown error'}` 
        };
      }
    }
    
    return { text: response.text };
  } catch (error) {
    console.error('[STT-LLM] Error:', error);
    // Fallback response
    return { 
      text: 'I heard you, but I am having trouble processing your request right now. Please try again.' 
    };
  }
}

/**
 * POST /api/stt-llm
 * Main endpoint for speech-to-text + LLM processing
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[STT-LLM] Processing request...');

    const body: STTLLMRequest = await req.json();
    const { text, conversationHistory = [] } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    console.log(`[STT-LLM] User: "${text}"`);

    // Generate response with Gemini
    const response = await generateWithGemini(text, conversationHistory);
    
    if (!response.text) {
      throw new Error('No response generated');
    }

    const latency = Date.now() - startTime;
    console.log(`[STT-LLM] Response generated in ${latency}ms:`, response.text.substring(0, 100));

    return NextResponse.json({
      text: response.text,
      latency,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[STT-LLM] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Note for future Gemini Realtime upgrade:
 * 
 * Replace this REST endpoint with WebSocket/WebRTC connection:
 * 
 * 1. Establish persistent connection to Gemini Realtime API
 * 2. Stream audio chunks directly (no batching needed)
 * 3. Receive partial transcripts in real-time
 * 4. Get streaming responses with lower latency
 * 5. Handle barge-in natively with connection state
 * 
 * Benefits:
 * - True streaming ASR with partial results
 * - Lower latency (100-300ms vs 500-1000ms)
 * - Better turn-taking and interruption handling
 * - Single connection for STT + LLM + TTS
 */
