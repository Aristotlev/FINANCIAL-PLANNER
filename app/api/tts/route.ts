/**
 * TTS Streaming Proxy with Multiple Provider Support
 * Supports both ElevenLabs and Replicate (Kokoro-82m)
 * 
 * Provider Selection:
 * - Default: ElevenLabs (better quality, streaming)
 * - Alternative: Replicate (pass ?provider=replicate in URL)
 */

import { NextRequest } from "next/server";
import { ElevenLabsClient } from "elevenlabs";
import Replicate from "replicate";

const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Arabella voice - HARDCODED - professional, clear female voice perfect for financial analysis
const ELEVENLABS_VOICE_ID = 'Z3R5wn05IrDiVCyEkUrK'; // Arabella (HARDCODED)
const REPLICATE_VOICE = 'af_nicole'; // Nicole voice for Replicate

console.log('[TTS CONFIG] ElevenLabs voice:', ELEVENLABS_VOICE_ID);
console.log('[TTS CONFIG] Voice name: Arabella (HARDCODED - Professional financial assistant)');
console.log('[TTS CONFIG] ElevenLabs API Key configured:', ELEVENLABS_API_KEY ? 'YES ✅' : 'NO ❌');
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
    console.log('[TTS] Received request');
    
    // Get provider from query params or use default (elevenlabs)
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider') || 'elevenlabs';
    
    console.log('[TTS] Provider:', provider);
    
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

    // Route to appropriate provider
    if (provider === 'replicate') {
      return await handleReplicateTTS(text, voice, startTime);
    } else {
      return await handleElevenLabsTTS(text, startTime);
    }

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
 * Handle TTS using ElevenLabs (streaming, high quality)
 */
async function handleElevenLabsTTS(text: string, startTime: number) {
  if (!ELEVENLABS_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ElevenLabs API key not configured' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  console.log(`[TTS-ELEVENLABS] Synthesizing with Arabella voice: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

  // Initialize ElevenLabs client
  const elevenlabs = new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
  });

  // Generate audio using official SDK with optimized settings for clarity
  const audio = await elevenlabs.textToSpeech.convert(
    ELEVENLABS_VOICE_ID,
    {
      text,
      model_id: 'eleven_turbo_v2', // Fast model with good quality
      output_format: 'mp3_22050_32', // Lower bitrate for faster streaming
      optimize_streaming_latency: 3, // Balanced optimization (reduced from 4 for better quality)
      voice_settings: {
        stability: 0.6, // Increased for more stable, clearer speech
        similarity_boost: 0.85, // Higher for better voice match and clarity
        style: 0.0,
        use_speaker_boost: true,
      },
    }
  );

  const latency = Date.now() - startTime;
  console.log(`[TTS-ELEVENLABS] Audio generated (${latency}ms latency)`);

  // Convert async iterable to ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of audio) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  // Stream audio directly to client
  return new Response(stream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Latency': `${latency}ms`,
      'X-Provider': 'elevenlabs',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * Handle TTS using Replicate Kokoro-82m (high quality, slower)
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
