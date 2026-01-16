import { NextRequest, NextResponse } from 'next/server';
import { createFinnhubClient } from '../../../../lib/api/finnhub-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const limit = searchParams.get('limit');
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const finnhub = createFinnhubClient();
    // Default limit to 4 if not specified (replicating Free Tier behavior or as per user request to be smart)
    const limitNum = limit ? parseInt(limit, 10) : 4;
    
    // Note: getEarnings updates in lib/api/finnhub-api.ts should support limit now
    const data = await finnhub.getEarnings(symbol, limitNum);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching earnings surprises:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch earnings surprises' },
      { status: 500 }
    );
  }
}
