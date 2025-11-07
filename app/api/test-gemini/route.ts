/**
 * Test endpoint to verify Gemini API access and available models
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_AI_API_KEY not configured' },
      { status: 500 }
    );
  }

  // Test models in order of preference
  const modelsToTest = [
    'gemini-2.5-flash',          // Latest and best (confirmed available)
    'gemini-2.5-pro',            // More capable version
    'gemini-1.5-flash',          // Stable fallback
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-flash-latest',
    'gemini-pro-latest',
  ];

  const results = [];

  for (const model of modelsToTest) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: 'Hello' }]
            }],
          }),
        }
      );

      const responseText = await response.text();
      
      results.push({
        model,
        status: response.status,
        available: response.ok,
        error: !response.ok ? responseText.substring(0, 200) : null,
      });

      // If successful, we found a working model
      if (response.ok) {
        console.log(`✅ Working model found: ${model}`);
      }
    } catch (error) {
      results.push({
        model,
        status: 'error',
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const workingModels = results.filter(r => r.available);
  const recommendedModel = workingModels[0]?.model || null;

  return NextResponse.json({
    apiKeyConfigured: true,
    recommendedModel,
    results,
    summary: {
      total: results.length,
      working: workingModels.length,
      failed: results.length - workingModels.length,
    },
  });
}
