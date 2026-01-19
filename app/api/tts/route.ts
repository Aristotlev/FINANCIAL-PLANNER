/**
 * TTS Proxy using Replicate (Kokoro-82m)
 * Protected by authentication and rate limiting
 */

import { NextRequest } from "next/server";
import Replicate from "replicate";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit, getClientIP, RateLimitConfigs } from "@/lib/rate-limit";

// ✅ SECURE: Server-side only environment variables
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Default voice for Replicate Kokoro model
const REPLICATE_VOICE = 'af_nicole'; // Nicole voice - professional, clear female voice

console.log('[TTS CONFIG] Voice: Nicole (Replicate Kokoro)');
console.log('[TTS CONFIG] Replicate API Token configured:', REPLICATE_API_TOKEN ? 'YES ✅' : 'NO ❌');

// Handle CORS preflight for Brave browser
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ✅ Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Please sign in to use TTS features' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[TTS] Received authenticated request from user:', session.user.id);
    
    // ✅ Rate limiting - TTS is expensive, limit to 30 requests/min
    const headersList = await headers();
    const identifier = session.user?.id || getClientIP(headersList);
    const rateLimitResult = await rateLimit(identifier, RateLimitConfigs.AI_MODERATE);

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please try again later.',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: new Date(rateLimitResult.reset).toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    const { text, voice } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Use Replicate for TTS
    return await handleReplicateTTS(text, voice, startTime);

  } catch (error) {
    console.error('[TTS] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle TTS using Replicate Kokoro-82m
 */
async function handleReplicateTTS(text: string, voice: string | undefined, startTime: number) {
  if (!REPLICATE_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Replicate API token not configured' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const selectedVoice = voice || REPLICATE_VOICE;
  console.log(`[TTS-REPLICATE] Synthesizing with voice "${selectedVoice}": "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

  // Initialize Replicate client
  const replicate = new Replicate({
    auth: REPLICATE_API_TOKEN,
  });

  // Run the Kokoro-82m model
  const output = await replicate.run(
    "jaaari/kokoro-82m:f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13",
    {
      input: {
        text,
        voice: selectedVoice,
      }
    }
  ) as any;

  const latency = Date.now() - startTime;
  console.log(`[TTS-REPLICATE] Audio generated (${latency}ms latency)`);

  // The output is a FileOutput object with a url() method
  const audioUrl = output.url();
  console.log(`[TTS-REPLICATE] Audio URL:`, audioUrl);

  // Fetch the audio file from Replicate's delivery URL
  const audioResponse = await fetch(audioUrl);
  
  if (!audioResponse.ok) {
    throw new Error(`Failed to fetch audio from Replicate: ${audioResponse.status}`);
  }

  // Get the audio data as a buffer
  const audioBuffer = await audioResponse.arrayBuffer();

  // Return the audio file
  return new Response(audioBuffer, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.byteLength.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Latency': `${latency}ms`,
      'X-Voice': selectedVoice,
      'X-Provider': 'replicate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
