/**
 * Voice pipeline endpoint
 * Receives audio → Gemini (transcribe + respond) → ElevenLabs TTS → stream back
 * Protected by authentication and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit, getClientIP, RateLimitConfigs } from "@/lib/rate-limit";

// ✅ SECURE: Server-side only environment variables
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// Arabella voice - HARDCODED - professional, clear female voice perfect for financial analysis
const ELEVENLABS_VOICE_ID = 'Z3R5wn05IrDiVCyEkUrK'; // Arabella (HARDCODED)

const ELEVENLABS_ENDPOINT = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`;

console.log('[VOICE CONFIG] Using ElevenLabs voice:', ELEVENLABS_VOICE_ID);
console.log('[VOICE CONFIG] Voice name: Arabella (HARDCODED - Professional financial assistant)');

interface VoiceRequest {
  audio?: string; // base64 PCM16
  text?: string;  // direct text input
}

async function transcribeWithGemini(audioBase64: string): Promise<string> {
  console.log('[STT] Transcribing with Gemini...');
  
  // For now, Gemini doesn't have direct audio transcription in REST API
  // We'll use a placeholder or you can integrate Google Speech-to-Text
  // For this implementation, we'll use text input directly
  
  throw new Error('Audio transcription not yet implemented. Use text input.');
}

async function generateResponseWithGemini(text: string): Promise<string> {
  console.log('[LLM] Generating response for:', text.substring(0, 50) + '...');
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.candidates[0].content.parts[0].text;
  
  console.log('[LLM] Response generated:', responseText.substring(0, 50) + '...');
  return responseText;
}

async function synthesizeWithElevenLabs(text: string): Promise<ReadableStream<Uint8Array>> {
  console.log('[TTS] Synthesizing speech with ElevenLabs...');
  
  const response = await fetch(
    `${ELEVENLABS_ENDPOINT}?optimize_streaming_latency=1`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error('No response body from ElevenLabs');
  }

  console.log('[TTS] Speech synthesis started');
  return response.body;
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to use voice features' },
        { status: 401 }
      );
    }

    console.log('[VOICE] Processing authenticated request from user:', session.user.id);

    // ✅ Rate limiting - Voice pipeline is very expensive
    const headersList = await headers();
    const identifier = session.user?.id || getClientIP(headersList);
    const rateLimitResult = await rateLimit(identifier, RateLimitConfigs.AI_STRICT);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: new Date(rateLimitResult.reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
      return NextResponse.json(
        { error: 'ElevenLabs credentials not configured' },
        { status: 500 }
      );
    }

    const body: VoiceRequest = await request.json();

    // Get input text (either from direct text or transcription)
    let inputText: string;
    
    if (body.text) {
      inputText = body.text;
      console.log('[VOICE] Using direct text input');
    } else if (body.audio) {
      // Future: implement audio transcription
      return NextResponse.json(
        { error: 'Audio transcription not yet implemented. Use text input.' },
        { status: 501 }
      );
    } else {
      return NextResponse.json(
        { error: 'Either text or audio required' },
        { status: 400 }
      );
    }

    // Step 1: Generate response with Gemini
    const responseText = await generateResponseWithGemini(inputText);

    // Step 2: Synthesize with ElevenLabs
    const audioStream = await synthesizeWithElevenLabs(responseText);

    // Step 3: Stream audio back to client
    console.log('[VOICE] Streaming audio to client...');
    
    return new NextResponse(audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('[VOICE] Error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
