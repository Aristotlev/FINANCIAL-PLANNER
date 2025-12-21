import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('❌ Gemini API key not configured on server');
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use the same model logic as GeminiService
    // Try different model names in order of preference
    const modelNames = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
    ];

    let model;
    let responseText;

    for (const modelName of modelNames) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        responseText = response.text();
        break; // Success
      } catch (error) {
        console.warn(`⚠️ Model ${modelName} failed in proxy:`, error);
        continue;
      }
    }

    if (!responseText) {
      throw new Error('All Gemini models failed');
    }

    return NextResponse.json({ text: responseText });
  } catch (error) {
    console.error('❌ Gemini Proxy Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
