/**
 * Runtime Environment Variables Endpoint
 * This API route serves environment variables at runtime
 * It replaces the placeholder values with actual environment variables
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const envScript = `
(function() {
  window.__ENV__ = {
    NEXT_PUBLIC_SUPABASE_URL: '${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}',
    NEXT_PUBLIC_APP_URL: '${process.env.NEXT_PUBLIC_APP_URL || ''}',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}',
    NEXT_PUBLIC_GOOGLE_AI_API_KEY: '${process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || ''}',
    NEXT_PUBLIC_ELEVENLABS_API_KEY: '${process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || ''}',
    NEXT_PUBLIC_ELEVENLABS_VOICE_ID: '${process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || ''}',
  };
  
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[Runtime ENV] Environment variables loaded at runtime');
    console.log('[Runtime ENV] Supabase configured:', !!window.__ENV__.NEXT_PUBLIC_SUPABASE_URL);
  }
})();
  `.trim();

  return new Response(envScript, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
