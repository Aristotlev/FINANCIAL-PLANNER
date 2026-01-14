/**
 * Gemini API endpoint for text generation
 * Uses Gemini 1.5 Flash via REST API
 * Protected by authentication and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimit, getClientIP, RateLimitConfigs } from "@/lib/rate-limit";

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

interface GeminiRequest {
  text: string;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

const RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 500,
  maxDelay: 2000,
};

async function callGeminiWithRetry(
  text: string,
  attempt = 1
): Promise<string> {
  try {
    console.log(`[LLM] Calling Gemini API (attempt ${attempt})...`);
    console.log(`[LLM] Endpoint: ${GEMINI_ENDPOINT}`);
    
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
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
          maxOutputTokens: 1024,
          topP: 0.8,
          topK: 40,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates from Gemini');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log(`[LLM] Received response (${responseText.length} chars)`);
    
    return responseText;
    
  } catch (error) {
    console.error(`[LLM] Attempt ${attempt} failed:`, error);
    
    if (attempt >= RETRY_CONFIG.maxAttempts) {
      throw error;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500,
      RETRY_CONFIG.maxDelay
    );
    
    console.log(`[LLM] Retrying in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return callGeminiWithRetry(text, attempt + 1);
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to use AI features' },
        { status: 401 }
      );
    }

    // ✅ Rate limiting - prevent API abuse
    const headersList = await headers();
    const identifier = session.user?.id || getClientIP(headersList);
    const rateLimitResult = await rateLimit(identifier, RateLimitConfigs.AI_STRICT);

    if (!rateLimitResult.success) {
      const resetDate = new Date(rateLimitResult.reset);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: resetDate.toISOString(),
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
      console.error('[LLM] GEMINI_API_KEY not configured');
      // For development, return mock data if key is missing
      if (process.env.NODE_ENV === 'development') {
        const mockResponse = `**Portfolio Analysis (MOCK DATA)**\n\n**1. Portfolio Allocation & Diversification Rating: 7/10**\n- Your portfolio shows a decent mix of assets, but might be heavy on major caps.\n\n**2. Risk Assessment: Medium**\n- Typical volatility for the crypto market.\n\n**3. Strengths**\n- Established assets present.\n- Clear entry points tracked.\n\n**4. Weaknesses**\n- Potential lack of sector variety (e.g., DeFi, Gaming, L2s).\n\n**5. Strategic Suggestions**\n- Consider exploring emerging ecosystems.\n- Set stop-loss orders for volatility management.`;
        
        await new Promise(r => setTimeout(r, 1500)); // Simulate delay
        return NextResponse.json({
          text: mockResponse,
          model: 'gemini-1.5-flash-mock',
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const body: GeminiRequest = await request.json();
    
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: text field required' },
        { status: 400 }
      );
    }

    const responseText = await callGeminiWithRetry(body.text);

    return NextResponse.json({
      text: responseText,
      model: 'gemini-pro',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[LLM] Error:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
