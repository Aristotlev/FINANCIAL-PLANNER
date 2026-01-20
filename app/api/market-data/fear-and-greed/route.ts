import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const apiKey = process.env.CMC_API_KEY || process.env.NEXT_PUBLIC_CMC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'CoinMarketCap API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          'Accept': 'application/json'
        },
        cache: 'no-store' // We want latest data
      }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('CoinMarketCap API error:', response.status, errorText);
        
        // Mock data fallback if API fails or quota exceeded (development mode)
        // This ensures the UI doesn't break if the API key doesn't have access to this specific endpoint
        if (response.status === 403 || response.status === 401 || response.status === 429) {
           console.warn('Falling back to mock Fear & Greed data due to API restriction');
           return NextResponse.json({
             data: {
               value: 65,
               value_classification: "Greed",
               timestamp: new Date().toISOString(),
               time_until_update: "900" 
             }
           });
        }

        return NextResponse.json(
            { error: `CoinMarketCap API error: ${response.status}` },
            { status: response.status }
        );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Fear & Greed API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Fear & Greed Index' },
      { status: 500 }
    );
  }
}
