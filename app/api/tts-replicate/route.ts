/**
 * TTS API using Replicate's Kokoro-82m Model
 * High-quality text-to-speech with multiple voice options
 */

import { NextRequest } from "next/server";
import Replicate from "replicate";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Available voices in Kokoro-82m model
// af_nicole, af_sarah, am_adam, am_michael, bf_emma, bf_isabella, bm_george, bm_lewis
const DEFAULT_VOICE = "af_nicole"; // Female, professional voice

console.log('[TTS-REPLICATE CONFIG] API Token configured:', REPLICATE_API_TOKEN ? 'YES ✅' : 'NO ❌');
console.log('[TTS-REPLICATE CONFIG] Default voice:', DEFAULT_VOICE);

// Handle CORS preflight
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
    console.log('[TTS-REPLICATE] Received request');
    
    if (!REPLICATE_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Replicate API token not configured' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
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

    const selectedVoice = voice || DEFAULT_VOICE;
    
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
    ) as any; // Replicate output type

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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('[TTS-REPLICATE] Error:', error);
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
